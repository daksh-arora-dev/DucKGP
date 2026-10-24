import pytest
import httpx

from kgp_student_assistant.integrations.iqps import (
    IQPSClient,
    normalize_exam,
)


# --------------------------------------------------
# TEST CONFIGURATION
# --------------------------------------------------

BASE_URL = "https://iqps.example.test"

# Fake IQPS response data
MOCK_PAPER = {
    "id": 125,
    "filelink": "https://example.com/paper.pdf",
    "from_library": True,
    "course_code": "CH21207",
    "course_name": "Fluid Mechanics",
    "year": 2024,
    "semester": "autumn",
    "exam": "midsem",
    "note": "",
}


# Helper: Run IQPSClient with a mocked HTTP server
async def mock_search(
    handler,
    query="CH21207",
    exam="midsem",
):

    transport = httpx.MockTransport(handler)

    async with httpx.AsyncClient(transport=transport) as http_client:

        client = IQPSClient(
            base_url=BASE_URL,
            http_client=http_client
        )

        return await client.search(query, exam)


# ==================================================
# 1. INPUT NORMALIZATION TESTS
# ==================================================

@pytest.mark.parametrize(
    "input_exam, expected",
    [
        ("MIDSEM", "midsem"),
        (" EndSem ", "endsem"),
        ("CT", "ct"),
        ("CT1", "ct1"),
        ("MIDSEM, ENDSEM", "midsem,endsem"),
        (None, None),
        ("   ", None),
    ]
)
def test_exam_normalization(input_exam, expected):

    assert normalize_exam(input_exam) == expected


@pytest.mark.parametrize(
    "invalid_exam",
    [
        "random",
        "mid sem",
        "final",
        "midsem,invalid",
    ]
)
def test_invalid_exam(invalid_exam):

    with pytest.raises(ValueError):
        normalize_exam(invalid_exam)


# ==================================================
# 2. QUERY VALIDATION TESTS
# ==================================================

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "query",
    ["", "   ", "\n"]
)
async def test_empty_query(query):

    client = IQPSClient(base_url=BASE_URL)

    with pytest.raises(ValueError, match="Course query cannot be empty"):
        await client.search(query)


# ==================================================
# 3. SUCCESSFUL SEARCH TEST
# ==================================================

@pytest.mark.asyncio
async def test_successful_search():

    def handler(request: httpx.Request):

        # Verify HTTP method
        assert request.method == "GET"

        # Verify endpoint
        assert request.url.path == "/search"

        # Verify parameters
        assert request.url.params["query"] == "CH21207"
        assert request.url.params["exam"] == "midsem,endsem"

        return httpx.Response(
            status_code=200,
            json={
                "status": "success",
                "message": "Successfully fetched 1 paper.",
                "data": [MOCK_PAPER],
            }
        )

    papers = await mock_search(
        handler,
        query=" CH21207 ",
        exam="MIDSEM, ENDSEM"
    )

    assert len(papers) == 1
    assert papers[0]["course_code"] == "CH21207"
    assert papers[0]["year"] == 2024


# ==================================================
# 4. SEARCH WITHOUT EXAM FILTER
# ==================================================

@pytest.mark.asyncio
@pytest.mark.parametrize("exam", [None, "   "])
async def test_search_without_exam(exam):

    def handler(request):

        assert request.url.params["query"] == "CH21207"

        # Exam parameter should not be sent
        assert "exam" not in request.url.params

        return httpx.Response(
            200,
            json={
                "status": "success",
                "data": [MOCK_PAPER]
            }
        )

    papers = await mock_search(handler, exam=exam)

    assert len(papers) == 1


# ==================================================
# 5. EMPTY SEARCH RESULTS
# ==================================================

@pytest.mark.asyncio
async def test_no_papers_found():

    def handler(request):

        return httpx.Response(
            200,
            json={
                "status": "success",
                "message": "No papers found",
                "data": []
            }
        )

    papers = await mock_search(handler)

    assert papers == []


# ==================================================
# 6. HTTP ERROR HANDLING
# ==================================================

@pytest.mark.asyncio
@pytest.mark.parametrize("status_code", [400, 404, 429, 500, 503])
async def test_http_errors(status_code):

    def handler(request):

        return httpx.Response(
            status_code=status_code
        )

    with pytest.raises(
        RuntimeError,
        match=f"IQPS returned HTTP {status_code}"
    ):
        await mock_search(handler)


# ==================================================
# 7. CONNECTION ERROR
# ==================================================

@pytest.mark.asyncio
async def test_connection_failure():

    def handler(request):

        raise httpx.ConnectError(
            "Connection failed",
            request=request
        )

    with pytest.raises(
        RuntimeError,
        match="Could not connect to the IQPS backend"
    ):
        await mock_search(handler)


# ==================================================
# 8. TIMEOUT ERROR
# ==================================================

@pytest.mark.asyncio
async def test_timeout():

    def handler(request):

        raise httpx.ReadTimeout(
            "Request timed out",
            request=request
        )

    with pytest.raises(
        RuntimeError,
        match="Could not connect to the IQPS backend"
    ):
        await mock_search(handler)


# ==================================================
# 9. INVALID JSON RESPONSE
# ==================================================

@pytest.mark.asyncio
async def test_invalid_json():

    def handler(request):

        return httpx.Response(
            200,
            text="This is not JSON"
        )

    with pytest.raises(
        RuntimeError,
        match="IQPS returned invalid JSON"
    ):
        await mock_search(handler)


# ==================================================
# 10. BACKEND ERROR RESPONSE
# ==================================================

@pytest.mark.asyncio
async def test_backend_error_response():

    def handler(request):

        return httpx.Response(
            200,
            json={
                "status": "error",
                "message": "Invalid search query",
                "data": None
            }
        )

    with pytest.raises(
        RuntimeError,
        match="IQPS search failed"
    ):
        await mock_search(handler)


# ==================================================
# 11. INVALID RESPONSE STRUCTURE
# ==================================================

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {"status": "success"},
        {"status": "success", "data": None},
        {"status": "success", "data": {}},
        {"status": "success", "data": ["invalid paper"]},
    ]
)
async def test_invalid_response_structure(payload):

    def handler(request):

        return httpx.Response(
            200,
            json=payload
        )

    with pytest.raises(RuntimeError):
        await mock_search(handler)


# ==================================================
# 12. BASE URL NORMALIZATION
# ==================================================

def test_base_url_normalization():

    client = IQPSClient(
        base_url=" https://iqps.example.test/// "
    )

    assert client.base_url == BASE_URL