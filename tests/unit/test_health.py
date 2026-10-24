from kgp_student_assistant.mcp.tools.health import ping


def test_ping() -> None:
    assert ping() == {"status": "ok", "service": "kgp-student-assistant"}
