## Purpose

Defines the contract for the `GET /api/message` endpoint: what input it accepts, what it returns, in what shape, and which origins may call it cross-origin.

## Requirements

### Requirement: Message response
The system SHALL respond to `GET /api/message` with HTTP 200 and a JSON body containing a `message` field. The endpoint SHALL accept an optional `name` query parameter:

- When `name` is omitted, empty, or consists only of whitespace, `message` SHALL be `"Hello World"`.
- When `name` has non-whitespace content, `message` SHALL be `"Hello "` followed by the value of `name` with leading and trailing whitespace removed.

#### Scenario: Client fetches the message
- **WHEN** a client sends `GET /api/message`
- **THEN** the response has HTTP status 200 and a JSON body with `message` equal to `"Hello World"`

#### Scenario: Client supplies a name
- **WHEN** a client sends `GET /api/message?name=Ada`
- **THEN** the response has HTTP status 200 and a JSON body with `message` equal to `"Hello Ada"`

#### Scenario: Supplied name has surrounding whitespace
- **WHEN** a client sends `GET /api/message` with a `name` of `"  Ada Lovelace  "`
- **THEN** the response has HTTP status 200 and a JSON body with `message` equal to `"Hello Ada Lovelace"`

#### Scenario: Supplied name is blank
- **WHEN** a client sends `GET /api/message` with a `name` that is empty or only whitespace
- **THEN** the response has HTTP status 200 and a JSON body with `message` equal to `"Hello World"`

### Requirement: Supplied name length limit
The system SHALL reject a `name` query parameter longer than 50 characters after trimming, responding with HTTP 400 and without echoing the supplied value back in the response body.

#### Scenario: Name within the limit is accepted
- **WHEN** a client sends `GET /api/message` with a `name` of exactly 50 characters
- **THEN** the response has HTTP status 200 and `message` includes that name

#### Scenario: Over-long name is rejected
- **WHEN** a client sends `GET /api/message` with a `name` longer than 50 characters
- **THEN** the response has HTTP status 400
- **AND** the response body does not contain the supplied name

### Requirement: UTC timestamp on message response
The system SHALL include a `timestampUtc` field in the `/api/message` response, reflecting the time the response was generated, formatted as ISO 8601 with a `Z` suffix so its UTC-ness is unambiguous from the value alone (e.g. `2026-08-15T14:30:00Z`).

#### Scenario: Response includes a UTC-formatted timestamp
- **WHEN** a client sends `GET /api/message`
- **THEN** the response body includes a `timestampUtc` field
- **AND** the field's value parses as a valid ISO 8601 UTC timestamp ending in `Z`
- **AND** the field's value is within a few seconds of the time the request was made

### Requirement: CORS for web app origin
The system SHALL enable CORS on `/api/message` for the configured web app origin, allowing `GET` requests.

#### Scenario: Request from the allowed origin
- **WHEN** a browser sends `GET /api/message` with an `Origin` header matching the configured allowed origin
- **THEN** the response includes an `Access-Control-Allow-Origin` header matching that origin

#### Scenario: Request from a disallowed origin
- **WHEN** a browser sends `GET /api/message` with an `Origin` header that does not match the configured allowed origin
- **THEN** the response does not include an `Access-Control-Allow-Origin` header for that origin
