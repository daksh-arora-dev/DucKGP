"""External data access: put authorized IQPS HTTP/API interaction here."""


class IQPSClient:
    async def search(self, course_code: str) -> list[dict[str, str]]:
        """Search IQPS. Intentionally unimplemented until a source is approved."""
        raise NotImplementedError("Connect an authorized IQPS source before enabling this tool")
