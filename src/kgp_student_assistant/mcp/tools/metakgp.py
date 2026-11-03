"""MetaKGP MCP tools for DucKGP."""

from kgp_student_assistant.integrations.metakgp import (
    get_empty_classrooms,
    get_professor_schedule,
)


async def find_empty_classrooms(
    day: str | None = None,
    at_time: str | None = None,
    complex_name: str = "Any",
    floor: int | None = None,
    limit: int = 20,
) -> dict:
    """Find available IIT KGP classrooms using MetaKGP Chillzone.

    Specify weekday and time, e.g. Monday at 15:00.
    Defaults to the current IIT KGP weekday/time.

    Filter by NC, NR, Vikramshila, or floor 1-4.

    Results are timetable-based, not live occupancy.
    """

    return await get_empty_classrooms(
        day=day,
        at_time=at_time,
        complex_name=complex_name,
        floor=floor,
        limit=limit,
    )


async def where_is_my_prof(
    professor_name: str,
    day: str | None = None,
    at_time: str | None = None,
    department: str | None = None,
) -> dict:
    """Find a professor's scheduled classes using MetaKGP WIMP.

    Returns scheduled courses, possible classrooms,
    and other classes on the requested day.

    This is not real-time professor location tracking.
    """

    return await get_professor_schedule(
        professor_name=professor_name,
        day=day,
        at_time=at_time,
        department=department,
    )