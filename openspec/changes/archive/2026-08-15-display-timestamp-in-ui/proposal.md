## Why

The API already returns a `timestampUtc` field (added in `add-message-timestamp`), but the web app doesn't show it — the user has to inspect the network response to see it. Displaying it in the greeting closes that loop.

## What Changes

- The web app's rendered success message changes from just `message` (e.g. "Hello World") to `message` plus a human-readable rendering of `timestampUtc`, incorporated into one sentence, e.g. "Hello World, it is currently 4:37:58 PM UTC".
- **Assumption (format)**: the request's example just shows `<timestamp>` without specifying format. Rendering it as a readable local-clock-style time string with an explicit "UTC" suffix (via `Intl.DateTimeFormat` with `timeZone: 'UTC'`), not the raw ISO string — a raw `2026-08-15T16:37:58.649Z` embedded mid-sentence reads worse than "4:37:58 PM UTC", and the explicit "UTC" suffix preserves the original timestamp feature's goal of making its UTC-ness unambiguous even after reformatting.
- The loading and error states are unchanged.

## Capabilities

### New Capabilities
- `web-message-display`: the web app's rendering of the fetched message, timestamp, and error state. This is the first OpenSpec change to touch the web app's UI, so per `openspec/config.yaml`'s specs rule, only the requirement this change actually introduces (timestamp display) is specced here — the pre-existing message-only rendering and error-state behavior are left unspecced until a future change actually touches them.

### Modified Capabilities
(none)

## Impact

- `web/src/App.jsx`: the success-state render branch.
- `web/src/App.test.jsx`: existing success-render test's mock/assertion needs updating for the new text; add a timestamp-formatting assertion.
- No API changes — `timestampUtc` is already returned.
