"""LLM-callable MCP IQPS search tool."""
from typing import Any

from kgp_student_assistant.integrations.iqps import IQPSClient


async def search_pyqs(query: str, exam: str = "") -> list[dict[str, Any]]:
    """Find IIT KGP previous-year question papers by course code or name.

    Args:
        query: A course code such as CH21207 or part of a course name.
        exam: Optional IQPS filter, e.g. midsem, endsem, ct, ct1.
              Multiple filters can be supplied as comma-separated values.

    Returns:
        Matching papers with course details, year, exam type, and PDF filelink.
    """
    query = query.strip()
    if not query:
        raise ValueError("query must not be blank")
    return await IQPSClient().search(query, exam.strip() or None)
