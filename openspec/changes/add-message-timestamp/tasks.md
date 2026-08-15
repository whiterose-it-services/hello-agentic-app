## 1. API implementation

- [ ] 1.1 Add a `TimestampUtc` field to the `/api/message` response record in `api/Program.cs`
- [ ] 1.2 Populate it with the current UTC time at request time, formatted as ISO 8601 with a `Z` suffix (e.g. `DateTime.UtcNow.ToString("o")` or `DateTimeOffset.UtcNow`), serializing to the `timestampUtc` JSON field
- [ ] 1.3 Build (`dotnet build`) and manually verify (`dotnet run` + `curl`) that `GET /api/message` returns both `message` and `timestampUtc` in the expected format
