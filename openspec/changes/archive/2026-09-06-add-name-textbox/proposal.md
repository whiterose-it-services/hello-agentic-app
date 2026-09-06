## Why

The greeting is currently fixed: every visitor sees the same "Hello World". Letting a visitor type in some text (typically their name) and see it reflected back in the greeting makes the app respond to input rather than just display a constant, and exercises the full web-to-API round trip with a caller-supplied value.

## What Changes

- The web app gains a labelled textbox and a submit button. On submit (button click or Enter in the textbox) it re-fetches the message, passing the typed text to the API.
- `GET /api/message` accepts an optional `name` query parameter. When a non-blank `name` is supplied, the returned `message` is `"Hello <name>"`; when it is absent or blank, the response stays `"Hello World"` exactly as today.
- The API trims surrounding whitespace from `name` and caps the accepted length; over-long input is rejected with HTTP 400 rather than echoed back.
- The web app keeps rendering whatever `message` the API returns, joined with the existing UTC timestamp — the greeting text stays owned by the API.
- No breaking changes: an existing client calling `GET /api/message` with no query string sees identical behavior.

## Capabilities

### New Capabilities
<!-- None. Both affected capabilities already have specs. -->

### Modified Capabilities
- `message-api`: the `Message response` requirement gains caller-supplied personalization — an optional `name` query parameter that is woven into the returned `message`, with defined blank and over-length handling.
- `web-message-display`: the web app gains an input for the text and a submit action that re-fetches the message with that text, and renders the refreshed greeting.

## Impact

- `api/Program.cs` — `/api/message` endpoint signature and message construction; CORS policy already allows `GET` from the web origin, and a query parameter needs no CORS change.
- `api/tests/MessageEndpointTests.cs` — new cases for supplied name, blank name, and over-length name.
- `web/src/api.js` — `fetchMessage` takes an optional name and appends it as an encoded query parameter.
- `web/src/App.jsx`, `web/src/App.css` — form (textbox + button), submit handling, re-fetch state.
- `web/src/api.test.js`, `web/src/App.test.jsx` — new cases for the query parameter and the submit flow.
- No new dependencies, no new endpoints, no auth or persistence.
