"""MetaKGP Chillzone and WIMP integration.

Fetches and processes public timetable data.
Does not provide real-time occupancy or professor locations.
"""

import asyncio
import re
import time
from datetime import datetime
from difflib import get_close_matches
from zoneinfo import ZoneInfo

import httpx


# API URLs
CHILLZONE_URL = (
    "https://raw.githubusercontent.com/metakgp/chillzone/"
    "master/frontend/src/data/empty_schedule.json"
)

WIMP_URL = (
    "https://raw.githubusercontent.com/metakgp/wimp/master/data/data.json"
)

DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday")

HOURS = (8, 9, 10, 11, 12, 14, 15, 16, 17)

CACHE_SECONDS = 6 * 60 * 60

_CACHE: dict[str, tuple[float, object]] = {}
_LOCK = asyncio.Lock()


# --------------------------------------------------
# HELPERS
# --------------------------------------------------

def _slot_name(slot: int) -> str:
    h = HOURS[slot]
    return f"{h:02d}:00–{h+1:02d}:00 IST"


def _resolve_day_and_slot(
    day: str | None,
    at_time: str | None,
):
    now = datetime.now(ZoneInfo("Asia/Kolkata"))

    day_text = (day or now.strftime("%A")).strip().lower()

    day_index = next(
        (
            i for i, d in enumerate(DAYS)
            if d.lower() == day_text
            or d[:3].lower() == day_text
        ),
        None,
    )

    if day_index is None:
        return None, None, (
            "Timetables cover Monday–Friday only. "
            "Specify a weekday."
        )

    if at_time is None or at_time.strip().lower() == "now":
        hour = now.hour

    else:
        raw = at_time.strip().lower().replace(" ", "")

        match = re.fullmatch(
            r"(\d{1,2})(?::(\d{2}))?(am|pm)?",
            raw,
        )

        if not match:
            return None, None, (
                "Use a time like 10:00, 14:00 or 3pm (IST)."
            )

        hour = int(match.group(1))
        minute = int(match.group(2) or 0)
        marker = match.group(3)

        if (
            minute > 59
            or (marker and not 1 <= hour <= 12)
            or (not marker and hour > 23)
        ):
            return None, None, "Invalid time."

        if marker:
            hour = hour % 12 + (12 if marker == "pm" else 0)

        elif hour < 8:
            return None, None, (
                "For times before 08:00, use am/pm "
                "or 24-hour time."
            )

    if hour not in HOURS:
        return None, None, (
            "Outside published teaching slots "
            "(08:00–13:00 and 14:00–18:00 IST)."
        )

    return day_index, HOURS.index(hour), None


async def _fetch_json(url: str):
    """Fetch MetaKGP JSON data with 6-hour caching."""

    cached = _CACHE.get(url)

    if cached and time.monotonic() - cached[0] < CACHE_SECONDS:
        return cached[1]

    async with _LOCK:

        cached = _CACHE.get(url)

        if cached and time.monotonic() - cached[0] < CACHE_SECONDS:
            return cached[1]

        async with httpx.AsyncClient(
            timeout=30,
            follow_redirects=False,
        ) as client:

            response = await client.get(
                url,
                headers={
                    "User-Agent": (
                        "DucKGP/0.1 (MetaKGP timetable reader)"
                    )
                },
            )

            response.raise_for_status()
            data = response.json()

        _CACHE[url] = (time.monotonic(), data)

        return data


def _filter_rooms(
    rooms: list[str],
    complex_name: str,
    floor: int | None,
) -> list[str]:

    complex_name = (complex_name or "any").strip().upper()

    aliases = {
        "ANY": "",
        "NC": "NC",
        "NR": "NR",
        "V": "V",
        "VIKRAMSHILA": "V",
    }

    if complex_name not in aliases:
        raise ValueError(
            "complex_name must be Any, NC, NR, or Vikramshila"
        )

    prefix = aliases[complex_name]

    selected = []

    for room in rooms:

        if prefix and not room.startswith(prefix):
            continue

        if floor is not None and not room.startswith("V"):

            if len(room) < 3 or room[2] != str(floor):
                continue

        selected.append(room)

    return sorted(set(selected))


# --------------------------------------------------
# CHILLZONE INTEGRATION
# --------------------------------------------------

async def get_empty_classrooms(
    day: str | None = None,
    at_time: str | None = None,
    complex_name: str = "Any",
    floor: int | None = None,
    limit: int = 20,
) -> dict:
    """Retrieve timetable-free classrooms from Chillzone."""

    day_idx, slot_idx, error = _resolve_day_and_slot(
        day,
        at_time,
    )

    if error:
        return {"error": error}

    if floor is not None and floor not in (1, 2, 3, 4):
        return {
            "error": "floor must be 1, 2, 3, 4, or omitted"
        }

    try:
        data = await _fetch_json(CHILLZONE_URL)

        if not isinstance(data, list) or len(data) != 5:
            raise ValueError("Unexpected Chillzone data format")

        schedule = data[day_idx]

        rooms = _filter_rooms(
            schedule[slot_idx],
            complex_name,
            floor,
        )

        following = (
            set(schedule[slot_idx + 1])
            if slot_idx < 8
            else set()
        )

        entire_day = set.intersection(
            *(set(items) for items in schedule)
        )

    except (
        httpx.HTTPError,
        ValueError,
        IndexError,
        TypeError,
        KeyError,
    ) as exc:

        return {
            "error": (
                "Chillzone timetable unavailable: "
                f"{type(exc).__name__}"
            )
        }

    n = max(1, min(limit, 30))

    return {
        "day": DAYS[day_idx],
        "slot": _slot_name(slot_idx),
        "total_matching_rooms": len(rooms),
        "rooms": [
            {
                "room": room,
                "free_next_teaching_slot": (
                    room in following
                    if slot_idx < 8
                    else None
                ),
                "free_all_day_may_be_locked": (
                    room in entire_day
                ),
            }
            for room in rooms[:n]
        ],
        "truncated": len(rooms) > n,
        "source": (
            "MetaKGP Chillzone "
            "(published timetable, not real-time occupancy)"
        ),
        "source_url": "https://chill.metakgp.org/",
        "warning": (
            "Timetables can be outdated or changed; "
            "a listed room may be locked or in use."
        ),
    }


# --------------------------------------------------
# WIMP INTEGRATION
# --------------------------------------------------

async def get_professor_schedule(
    professor_name: str,
    day: str | None = None,
    at_time: str | None = None,
    department: str | None = None,
) -> dict:
    """Retrieve professor timetable information from WIMP."""

    query = professor_name.strip().casefold()

    if len(query) < 3:
        return {
            "error": (
                "Provide at least 3 characters "
                "of the professor's name."
            )
        }

    day_idx, slot_idx, error = _resolve_day_and_slot(
        day,
        at_time,
    )

    if error:
        return {"error": error}

    try:
        data = await _fetch_json(WIMP_URL)

        if not isinstance(data, list):
            raise ValueError("Unexpected WIMP data format")

        matches = [
            entry
            for entry in data
            if query in str(
                entry.get("prof", {}).get("name", "")
            ).casefold()
            and (
                not department
                or department.casefold()
                in (
                    str(
                        entry.get("prof", {}).get(
                            "department", ""
                        )
                    )
                    + " "
                    + str(
                        entry.get("prof", {}).get(
                            "dept_code", ""
                        )
                    )
                ).casefold()
            )
        ]

    except (
        httpx.HTTPError,
        ValueError,
        TypeError,
        KeyError,
    ) as exc:

        return {
            "error": (
                "WIMP timetable unavailable: "
                f"{type(exc).__name__}"
            )
        }

    if not matches:

        names = [
            entry.get("prof", {}).get("name", "")
            for entry in data
        ]

        return {
            "matches": [],
            "suggestions": get_close_matches(
                professor_name,
                names,
                n=5,
                cutoff=0.45,
            ),
            "source": "MetaKGP WIMP",
        }

    matches.sort(
        key=lambda entry: (
            str(entry["prof"]["name"]).casefold() != query,
            len(str(entry["prof"]["name"])),
        )
    )

    found = []

    for entry in matches[:5]:

        prof = entry.get("prof", {})

        courses_today = []
        currently_scheduled = []

        for course in entry.get("timetable", []):

            slots = sorted({
                s
                for d, s in course.get("slots", [])
                if d == day_idx and 0 <= s < 9
            })

            if not slots:
                continue

            item = {
                "course": course.get("course_name"),
                "course_code": course.get("course_code"),
                "possible_rooms": course.get("rooms", []),
                "slots": [
                    _slot_name(s)
                    for s in slots
                ],
            }

            courses_today.append(item)

            if slot_idx in slots:
                currently_scheduled.append(item)

        found.append({
            "name": prof.get("name"),
            "department": prof.get("department"),
            "profile_url": prof.get("profile_url"),
            "currently_scheduled_classes": currently_scheduled,
            "other_classes_that_day": [
                c
                for c in courses_today
                if c not in currently_scheduled
            ][:8],
            "status": (
                "Scheduled class"
                if currently_scheduled
                else (
                    "No class listed for this slot; "
                    "actual location unknown"
                )
            ),
        })

    return {
        "day": DAYS[day_idx],
        "slot": _slot_name(slot_idx),
        "matches": found,
        "more_matches": max(0, len(matches) - 5),
        "source": (
            "MetaKGP WIMP "
            "(published timetable, not live location)"
        ),
        "source_url": "https://wimp.metakgp.org/",
        "warning": (
            "Classes/rooms may have changed. "
            "Verify with professor before visiting."
        ),
    }