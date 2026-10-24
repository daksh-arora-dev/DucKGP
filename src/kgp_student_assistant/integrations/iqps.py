"""HTTP adapter for the public, read-only IQPS search endpoint."""


from typing import Any
import httpx
from kgp_student_assistant.core.config import settings
import re


def normalize_exam(exam: str | None) -> str | None:

    if not exam:
        return None

    #Spliting comma-separated exam types
    exams = [
        value.strip().lower()
        for value in exam.split(",")
        if value.strip()
    ]

    #Validating against backend-supported values
    for value in exams:
        if value in {"midsem", "endsem", "ct"}:
            continue
        if re.fullmatch(r"ct[0-9]+", value):
            continue
        raise ValueError(f"Invalid exam type: {value}")

    return ",".join(exams) if exams else None



class IQPSClient:
    """Search MetaKGP IQPS through its existing /search endpoint."""


    def __init__(self, base_url: str | None = None, http_client: httpx.AsyncClient | None = None) -> None:

        if base_url is None:
            self.base_url = settings.iqps_base_url.strip().rstrip("/")
        else:
            self.base_url = base_url.strip().rstrip("/")
        
        if not self.base_url:
            raise ValueError("Set IQPS_BASE_URL in .env to the IQPS backend origin")

        self._http_client = http_client


    async def search(self, query: str, exam: str | None = None) -> list[dict[str, Any]]:
        """Return IQPS paper metadata and PDF links for a course name/code."""

        query = query.strip()
        if not query:
            raise ValueError("Course query cannot be empty")
        params = {"query": query}

        exam = normalize_exam(exam)
        if exam:
            params["exam"] = exam
            
        try:
            if self._http_client is None:
                async with httpx.AsyncClient(timeout=12) as client:
                    response = await client.get(f"{self.base_url}/search", params=params)
            else:
                response = await self._http_client.get(f"{self.base_url}/search", params=params)
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(f"IQPS returned HTTP {exc.response.status_code}") from exc
        except httpx.RequestError as exc:
            raise RuntimeError("Could not connect to the IQPS backend") from exc

        try:
            payload = response.json()
        except ValueError as exc:
            raise RuntimeError("IQPS returned invalid JSON") from exc
        if not isinstance(payload, dict) or payload.get("status") != "success":
            raise RuntimeError(f"IQPS search failed: {payload}")
        papers = payload.get("data")
        if not isinstance(papers, list) or not all(isinstance(paper, dict) for paper in papers):
            raise RuntimeError("Unexpected IQPS search response format")
        return papers



"""
json response as per iqps backend look like this:
    
    {
    "status": "success",
    "message": "Successfully fetched 2 papers.",
    "data": [
        {
            "id": 125,
            "filelink": "https://example.com/paper1.pdf",
            "from_library": true,
            "course_code": "CH21207",
            "course_name": "Fluid Mechanics",
            "year": 2024,
            "semester": "autumn",
            "exam": "midsem",
            "note": ""
        },
        {
            "id": 126,
            "filelink": "https://example.com/paper2.pdf",
            "from_library": false,
            "course_code": "CH21207",
            "course_name": "Fluid Mechanics",
            "year": 2023,
            "semester": "autumn",
            "exam": "midsem",
            "note": ""
        }
    ]
}

also, there are just 2 parameters that can be passed as query, exam which can be midsem, endsem, ct and they are case sensitive
"""