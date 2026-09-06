## Context

Today `GET /api/message` is a zero-argument minimal-API handler returning `new MessageResponse("Hello World", DateTime.UtcNow)`, and `web/src/App.jsx` fetches once in a `useEffect` with a three-state (`loading` / `success` / `error`) machine. `web/src/api.js` wraps `fetch` and throws on non-2xx. CORS is configured for a single allowed origin with `GET` only.

The greeting text stays owned by the API (see proposal.md — Why), so the web app's job is to collect input, pass it along, and render whatever comes back.

## Goals / Non-Goals

**Goals:**
- Keep `fetchMessage` the single place that knows the request URL, including query-string encoding.
- Keep the existing three-state render model in `App.jsx` rather than introducing a second parallel state machine for re-fetches.
- Validate the `name` bound in the API so the browser is not the only thing enforcing it.

**Non-Goals:**
- Client-side validation messaging for over-long input; the input's `maxLength` prevents it in practice and the API is the authority.
- Debouncing, request cancellation on rapid resubmits beyond the existing `cancelled` guard, or history of previous greetings.
- Sanitizing the name for HTML — React escapes text nodes, and the API returns JSON, not markup.

## Decisions

**1. `name` as an optional query parameter on the existing endpoint, not a new endpoint or a POST.**
The request is a read with no side effects, so `GET` with a query parameter is the natural fit and keeps the endpoint count at one (per CLAUDE.md: no extra endpoints). Alternatives: a second `/api/greeting` endpoint (more surface, splits the timestamp logic) or `POST` with a body (misrepresents a read, and would need the CORS policy widened past `GET`).

**2. Validation in the endpoint via an explicit length check returning `Results.BadRequest()`.**
Minimal APIs bind `string? name` from the query string automatically. Trim first, then compare length against a `MaxNameLength` constant (50), returning `Results.BadRequest()` with no body content derived from the input — so the over-long value is never reflected back. Alternative: a `[StringLength]`-style model with validation filters, which pulls in more machinery than one bound scalar warrants.

**3. Trim, then treat blank as absent.**
`string.IsNullOrWhiteSpace(name)` after binding collapses omitted, empty, and whitespace-only into the existing `"Hello World"` path, so the no-name behavior has exactly one code path and the old contract is preserved bit-for-bit.

**4. `fetchMessage(name)` builds the query with `URLSearchParams`.**
Called with no argument or a blank string, it requests the bare `/api/message` — so the initial `useEffect` call needs no change and existing `api.test.js` URL expectations still hold. `URLSearchParams` handles encoding of spaces, `&`, and non-ASCII characters, which hand-built string concatenation gets wrong.

**5. Re-use the existing status state for re-fetches; extract the fetch into a single callback.**
Both the initial load and a submit funnel into one `load(name)` function that sets `status` to `loading`, then `success`/`error`. This satisfies the spec's in-flight and failed-re-fetch scenarios without a separate "refreshing" state, and means a failed re-fetch cannot leave a stale greeting on screen. The trade-off is accepted below.

**6. A real `<form>` with `onSubmit`.**
Enter-to-submit comes for free from native form semantics rather than a keydown handler, and the label/input association via `htmlFor`/`id` gives the accessible-name behavior the spec requires.

## Risks / Trade-offs

- **Re-using `status` blanks the current greeting during a re-fetch** (the page flips to "Loading message..." rather than showing the old greeting dimmed) → Accepted: it is honest about what is on screen, and it is what the spec's "indicates that the message is loading" scenario describes. A nicer transition is a later change.
- **Rapid resubmits could race, with an earlier response landing last** → The existing `cancelled` flag pattern is extended so each `load` call invalidates the previous one's state writes; the newest submit wins.
- **The 50-character cap is arbitrary** → It is recorded in the spec, so raising it is a spec change rather than a silent tweak; the API and the input's `maxLength` read it from one constant each.
- **Query strings are logged by intermediaries**, so a supplied name may appear in access logs → Acceptable for a greeting demo with no auth or PII commitments; noted rather than mitigated.

## Migration Plan

No migration. The change is additive and backward compatible: `GET /api/message` with no query string behaves exactly as before, so API and web can deploy in either order.
