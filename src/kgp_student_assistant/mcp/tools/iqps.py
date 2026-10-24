"""Future IQPS tool; keep its interface separate from retrieval logic."""

from kgp_student_assistant.integrations.iqps import IQPSClient


async def search_pyqs(course_code: str) -> list[dict[str, str]]:
    """Find previous-year questions for a course using an authorized IQPS source."""
    if not course_code.strip():
        raise ValueError("course_code must not be blank")
    return await IQPSClient().search(course_code.strip())
