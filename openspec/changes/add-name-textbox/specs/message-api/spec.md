## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Supplied name length limit
The system SHALL reject a `name` query parameter longer than 50 characters after trimming, responding with HTTP 400 and without echoing the supplied value back in the response body.

#### Scenario: Name within the limit is accepted
- **WHEN** a client sends `GET /api/message` with a `name` of exactly 50 characters
- **THEN** the response has HTTP status 200 and `message` includes that name

#### Scenario: Over-long name is rejected
- **WHEN** a client sends `GET /api/message` with a `name` longer than 50 characters
- **THEN** the response has HTTP status 400
- **AND** the response body does not contain the supplied name
