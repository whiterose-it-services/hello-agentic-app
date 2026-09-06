## Purpose

Defines what the web app renders once it has successfully fetched the API message, and how the user supplies text to personalize it.

## Requirements

### Requirement: Timestamp shown alongside the message
On a successful fetch, the web app SHALL render the `message` value together with a human-readable rendering of `timestampUtc`, combined into one sentence, with the rendered time explicitly labeled as UTC.

#### Scenario: Successful fetch renders message and timestamp together
- **WHEN** the web app successfully fetches `{ message: "Hello World", timestampUtc: "2026-08-15T16:37:58Z" }`
- **THEN** the page displays text that includes both "Hello World" and a formatted rendering of the timestamp
- **AND** the displayed text makes clear the timestamp is UTC (e.g. a "UTC" label)

### Requirement: Name input and submit
The web app SHALL present a labelled single-line text input for the text to personalize the greeting with (typically a name), together with a submit control. Submitting SHALL re-fetch the message from the API, passing the current input value, and SHALL be triggered both by activating the submit control and by pressing Enter while the input is focused.

#### Scenario: Submitting a name fetches a personalized message
- **WHEN** the user types "Ada" into the name input and activates the submit control
- **THEN** the web app requests the message from the API passing "Ada" as the name
- **AND** the page displays the `message` the API returned for that request

#### Scenario: Pressing Enter submits
- **WHEN** the user types "Ada" into the name input and presses Enter
- **THEN** the web app requests the message from the API passing "Ada" as the name

#### Scenario: Input is labelled
- **WHEN** the page has loaded
- **THEN** the text input is reachable by its visible label, and the submit control has an accessible name

#### Scenario: Submitting an empty input
- **WHEN** the name input is empty and the user submits
- **THEN** the web app requests the message from the API without a name
- **AND** the page displays the unpersonalized message the API returned

### Requirement: Initial load is unpersonalized
On first load, before the user has submitted anything, the web app SHALL fetch and display the message without supplying a name, and the name input SHALL start empty.

#### Scenario: First load
- **WHEN** the web app loads
- **THEN** it fetches the message without a name and displays the returned `message` with its timestamp
- **AND** the name input is empty

### Requirement: Re-fetch outcome is visible
The web app SHALL keep the user informed while a submitted re-fetch is in flight and SHALL surface a failed re-fetch rather than leaving the previous greeting on screen as if it were the new result.

#### Scenario: Re-fetch in progress
- **WHEN** a submitted re-fetch is in flight
- **THEN** the page indicates that the message is loading

#### Scenario: Re-fetch fails
- **WHEN** a submitted re-fetch fails
- **THEN** the page displays an error message instead of the previous greeting
