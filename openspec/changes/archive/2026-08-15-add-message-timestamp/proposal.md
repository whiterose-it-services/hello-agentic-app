## Why

The `/api/message` response currently has no way to tell when it was generated. Adding a UTC timestamp lets clients (and anyone debugging the API) confirm freshness and removes ambiguity about timezone, since a bare timestamp could otherwise be misread as local time.

## What Changes

- `GET /api/message` gains a new field carrying the current UTC timestamp at request time.
- The field is named and formatted so its UTC-ness is unambiguous: `timestampUtc`, ISO 8601 with a `Z` suffix (e.g. `2026-08-15T14:30:00Z`), rather than a bare `timestamp` or a numeric epoch value.
- **Assumption (scope)**: this change is API-only. The request describes the API response shape and does not mention the web UI, so the React app's rendering of `message` is left as-is; the new field is not displayed. If timestamp display is wanted, that's a separate change.

## Capabilities

### New Capabilities
- `message-api`: the `GET /api/message` endpoint's contract - response shape, status code, and CORS behavior. This is the first OpenSpec change to touch this endpoint, so it establishes the capability's spec (existing behavior plus the new timestamp field) rather than delta-ing an existing spec file, per OpenSpec's brownfield-first model.

### Modified Capabilities
(none - no existing capability spec exists yet for `message-api`)

## Impact

- `api/Program.cs`: the `/api/message` route handler and its response DTO.
- `api/tests/MessageEndpointTests.cs`: existing status/body/CORS tests need updating for the new field; add a UTC-format assertion.
- No changes to `web/` (see scope assumption above).
