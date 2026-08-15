## Purpose

Defines what the web app renders once it has successfully fetched the API message.

## Requirements

### Requirement: Timestamp shown alongside the message
On a successful fetch, the web app SHALL render the `message` value together with a human-readable rendering of `timestampUtc`, combined into one sentence, with the rendered time explicitly labeled as UTC.

#### Scenario: Successful fetch renders message and timestamp together
- **WHEN** the web app successfully fetches `{ message: "Hello World", timestampUtc: "2026-08-15T16:37:58Z" }`
- **THEN** the page displays text that includes both "Hello World" and a formatted rendering of the timestamp
- **AND** the displayed text makes clear the timestamp is UTC (e.g. a "UTC" label)
