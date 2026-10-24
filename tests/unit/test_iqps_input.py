import asyncio

import pytest

from kgp_student_assistant.mcp.tools.iqps import search_pyqs


def test_search_rejects_empty_course_code() -> None:
    with pytest.raises(ValueError, match="course_code"):
        asyncio.run(search_pyqs("   "))
