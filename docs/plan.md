# Implementation Plan: Display API Message in Web App

Source: `docs/requirements.md` (FR-1..FR-6, NFR-1..NFR-3, AC-1..AC-5), `CLAUDE.md`.

This is a greenfield build: neither `api/` nor `web/` exist yet. This plan
scaffolds both from scratch so that the existing `.github/workflows/ci.yml`
(which runs `dotnet test` from `api/` and `npm ci && npm test` from `web/`)
passes without modification, and so that the CLAUDE.md commands
(`dotnet run --project api`, `dotnet test`, `npm run dev`, `npm test`) work
as documented.

---

## 1. Architecture Summary

Two independently-run processes, communicating over plain HTTP on
localhost during development:

- **`api/`** — a .NET 10 minimal Web API (single project, no controllers,
  no Swagger, no auth, no persistence). It exposes one route,
  `GET /api/message`, implemented directly in `Program.cs` with minimal
  API route mapping. It runs on `http://localhost:5000`
  (`dotnet run --project api`, per CLAUDE.md/NFR-3).
- **`web/`** — a React app built with Vite (plain JavaScript, no
  TypeScript — see Ambiguity A5). On mount, a single component fetches
  `GET /api/message` from the API's base URL, and renders either the
  `message` value or a legible error message. It runs on Vite's dev
  server (`npm run dev` in `web/`; default Vite port is `5173`).

**Communication path:** browser (React app served from the Vite origin)
→ `fetch()` → API origin (`http://localhost:5000`) → JSON response →
React renders the `message` field into the DOM. There is no server-side
rendering and no proxy between them — the browser makes a direct
cross-origin request from the Vite origin to the API origin.

**CORS:** because the web app's origin (`http://localhost:5173`) differs
from the API's origin (`http://localhost:5000`), this is a cross-origin
request by definition, and the browser will block it unless the API
sends the appropriate `Access-Control-Allow-Origin` header (FR-3, AC-2).
The plan therefore:
- Registers a named CORS policy in the API (`builder.Services.AddCors`)
  that allows the web app's origin, restricted to `GET` (the only method
  this app needs), and applies it (`app.UseCors(...)`) before the
  `/api/message` endpoint is mapped.
- Externalizes the allowed origin as configuration (`appsettings.json`,
  e.g. `Cors:AllowedOrigin`) rather than a compile-time constant, with a
  local-dev default of `http://localhost:5173`, so the value is not
  buried in code and can be overridden without a rebuild. See Ambiguity
  A2 — the exact dev port is an assumption, not a stated requirement.
- Deliberately does *not* use a Vite dev-server proxy to sidestep CORS.
  FR-3/AC-2 require CORS to actually be configured and exercised by a
  real cross-origin browser request; proxying `/api` through Vite would
  make the API calls same-origin from the browser's perspective and
  would defeat the purpose of that requirement.
- Does not address any non-localhost/production origin. Deployment is
  explicitly out of scope (`docs/requirements.md` "Out of Scope"), even
  though a `deploy.yml` workflow already exists in the repo referencing
  an Azure Static Web App and `VITE_API_URL`. See Ambiguity A7.

---

## 2. Ambiguities and Open Questions (flagged, not guessed)

These are called out explicitly per instructions rather than resolved
silently. Task 4 below is a cheap, early checkpoint specifically to
surface A1 before more work is built on top of a possibly-broken layout.

**A1 — Potential conflict between `dotnet run --project api` and CI's
implicit `dotnet test` in `api/` (highest-risk item).**
CLAUDE.md fixes the command `dotnet run --project api`, which requires
exactly one `.csproj` to live directly in `api/`. `ci.yml` runs
`dotnet restore` / `dotnet build` / `dotnet test` with **no explicit
project/solution argument** and `working-directory: api`, which is the
only way for those commands to also pick up `api/tests/*.csproj` is via
a solution file that is likewise discoverable from `api/` with no
argument. Having both a loose `.csproj` and a `.sln` in the *same*
directory is a known ambiguity trap for the dotnet CLI ("Specify which
project or solution file to use because this folder contains more than
one project or solution file") in some SDK versions, and `dotnet run`
does not accept solutions at all. Whether `api/api.csproj` +
`api/api.sln` can safely coexist for the .NET 10 SDK is not something
this plan can verify without running the actual tooling. **Working
assumption for this plan:** put `api/api.csproj` and `api/api.sln`
(referencing both `api/api.csproj` and `api/tests/Api.Tests.csproj`)
directly in `api/`, and verify all three commands
(`dotnet run --project api`, `dotnet build`, `dotnet test`, the latter
two run from `api/` with no arguments) succeed on a clean checkout as
Task 4, before writing any endpoint code. If they conflict, stop and
escalate rather than improvising a structural workaround that would
also require changing the already-existing `ci.yml`.

**A2 — Web dev server origin/port not specified.** Requirements and
CLAUDE.md never state the web app's dev port. Assuming Vite's default,
`http://localhost:5173`, and making it the CORS-configured origin.

**A3 — How the web app obtains the API base URL.** Requirements only
say the app "fetches `/api/message`" and must run via `npm run dev` in
`web/`, but the API runs on a different origin/port
(`http://localhost:5000`) than the Vite dev server, so a bare relative
path won't reach it. Plan uses a small config value
(`import.meta.env.VITE_API_BASE_URL`, default `http://localhost:5000`)
rather than a hardcoded string, mainly so the fetch target is one
obvious, greppable place — not because production deployment is in
scope (it is explicitly not, per requirements). This does incidentally
line up with the `VITE_API_URL` env var already referenced in the
existing (out-of-scope) `deploy.yml`, but wiring that up for production
is **not** part of this plan.

**A4 — Exact copy for the error state (AC-4).** Requirements say only
that the message must be "legible" and indicate the data "could not be
loaded." No exact string is specified. Plan proposes literal text
`"Unable to load message."` as a placeholder; implementer/tester should
treat the *presence and legibility* of an error indication as the
contract, not this exact wording, unless a stakeholder specifies copy.

**A5 — JavaScript vs. TypeScript.** Neither `docs/requirements.md` nor
`CLAUDE.md` mention TypeScript. Assuming plain JavaScript (Vite's
`react` template, not `react-ts`) to keep the surface area minimal, per
the "no more than what's requested" framing in the requirements.

**A6 — xUnit template/version specifics.** `dotnet new xunit` on the
.NET 10 SDK may default to xUnit v2 or v3 depending on installed
templates at implementation time. Not blocking; implementer should use
whatever the local SDK's default template provides and keep the
`api/tests` project buildable/testable via `dotnet test`.

**A7 — Production CORS / `VITE_API_URL` / Azure hosting are all
out of scope.** `deploy.yml` already exists and references a specific
Azure Web App name and a `VITE_API_URL` build-time env var, but
`docs/requirements.md` explicitly excludes deployment and hosting
infrastructure. This plan does not configure production CORS origins or
wire the web build to `VITE_API_URL`. Flagging so it isn't silently
forgotten when this feature is eventually deployed.

---

## 3. Ordered Task List

Tasks T1–T13 are scaffolding/implementation tasks (owned by the
implementer agent, per this repo's convention that the implementer
writes app code and the tester agent writes tests). Each task lists how
to verify it independently.

### API (`api/`)

**T1 — Scaffold the minimal Web API project.** *(supports NFR-3, groundwork for FR-1/FR-2)*
Run `dotnet new web -o api -n api` (or equivalent) from the repo root to
create `api/api.csproj` and a starter `Program.cs` targeting `net10.0`,
using the empty/minimal template (no controllers, no Swagger/OpenAPI
scaffolding, matching CLAUDE.md's "minimal Web API" description).
- Verify: `dotnet build` inside `api/` succeeds.

**T2 — Make `Program.cs` testable from `api/tests`.** *(groundwork for NFR-2)*
Add `public partial class Program { }` at the end of `api/Program.cs`
(top-level statements otherwise produce an `internal` implicit
`Program` class that `WebApplicationFactory<Program>` cannot see from a
separate test assembly).
- Verify: `dotnet build` still succeeds; no behavior change.

**T3 — Scaffold the xUnit test project.** *(groundwork for NFR-2)*
Run `dotnet new xunit -o api/tests -n Api.Tests`; add a
`Microsoft.AspNetCore.Mvc.Testing` package reference (for
`WebApplicationFactory`); add a `ProjectReference` from
`api/tests/Api.Tests.csproj` to `api/api.csproj`.
- Verify: `dotnet build` succeeds for `api/tests/Api.Tests.csproj` on its
  own (`dotnet build api/tests`).

**T4 — Resolve/verify the build-and-test entry point for `api/`.** *(de-risks A1; blocks nothing else structurally but should happen before T5+)*
Create `api/api.sln` referencing both `api/api.csproj` and
`api/tests/Api.Tests.csproj`. From a clean checkout, verify all of:
`dotnet run --project api` (starts and serves), and, with `api/` as the
working directory and no explicit project/solution argument,
`dotnet restore`, `dotnet build`, `dotnet test`. If any of these fail or
behave ambiguously, stop and report the conflict (see Ambiguity A1)
rather than guessing a fix that would require editing `ci.yml` or
CLAUDE.md.
- Verify: all four commands above succeed from a fresh clone.

**T5 — Implement `GET /api/message`.** *(FR-1, FR-2)*
Add a minimal API route `app.MapGet("/api/message", ...)` returning
HTTP 200 with a JSON body `{ "message": "Hello World" }` (a small
record/DTO, not an anonymous type with a differently-cased property, to
keep JSON serialization predictable).
- Verify: with the API running, `curl http://localhost:5000/api/message`
  returns status 200 and body `{"message":"Hello World"}`.

**T6 — Configure CORS for the web app's origin.** *(FR-3)*
Add `builder.Services.AddCors(...)` with a named policy allowing
`GET` from a configured origin (read from `appsettings.json`, e.g.
`Cors:AllowedOrigin`, defaulting to `http://localhost:5173` in
`appsettings.Development.json`), and call `app.UseCors(...)` before
endpoint mapping.
- Verify: `curl -i -H "Origin: http://localhost:5173" http://localhost:5000/api/message`
  returns an `Access-Control-Allow-Origin: http://localhost:5173` header.

**T7 — Confirm the API's default run configuration serves on port 5000.** *(NFR-3)*
Check/adjust `api/Properties/launchSettings.json` (or
`ASPNETCORE_URLS`) so that the default profile used by
`dotnet run --project api` (no extra flags) listens on
`http://localhost:5000`, without an HTTPS redirect that would break the
plain-HTTP dev flow from Vite.
- Verify: `dotnet run --project api` with no extra arguments logs
  "Now listening on: http://localhost:5000".

### Web (`web/`)

**T8 — Scaffold the Vite React app.** *(groundwork for FR-4/FR-5/FR-6)*
Run `npm create vite@latest web -- --template react` from the repo
root; `npm install`; commit the generated `web/package-lock.json`.
- Verify: `npm run dev` in `web/` boots and the default template page
  loads in a browser.

**T9 — Add a small API client module.** *(groundwork for FR-4)*
Create `web/src/api.js` exporting `fetchMessage()`, which calls
`fetch(`${API_BASE_URL}/api/message`)` (base URL from
`import.meta.env.VITE_API_BASE_URL`, default `http://localhost:5000`
per Ambiguity A3), and throws if `!response.ok` or the network call
rejects, so the caller has one place to `catch`.
- Verify: manual/console check that calling `fetchMessage()` against a
  running API resolves with `{ message: "Hello World" }`.

**T10 — Replace the default Vite page with the message-fetching UI.** *(FR-4, FR-5)*
Rewrite `web/src/App.jsx` to remove the Vite starter boilerplate
(counter, logos) and, on mount (`useEffect`), call `fetchMessage()`,
track status in state (`loading` / `success` / `error`), and render the
`message` text once loaded.
- Verify: with the API running, `npm run dev` + open browser shows the
  text "Hello World" on the page.

**T11 — Render a legible error state on failure.** *(FR-6)*
In the same `catch` path from T10, set an error state and render a
plain, readable message (see Ambiguity A4 for proposed copy) instead of
leaving the page blank; ensure the rejected promise is caught so no
unhandled exception surfaces.
- Verify: with the API stopped (or unreachable), `npm run dev` + open
  browser shows the error text and the browser console shows no
  unhandled promise rejection.

**T12 — Basic legibility pass.** *(NFR-1)*
Trim `web/src/index.css`/`App.css` from the Vite default (dark themed,
centered logo layout) to a simple, high-contrast, readable text layout.
No design system or styling framework is added.
- Verify: manual visual check of both the success and error states.

**T13 — Wire up the test runner (Vitest + RTL) without writing tests yet.** *(groundwork for NFR-2/AC-5; actual test files are written by the tester agent)*
Add `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`
as devDependencies; add a `test` block to `web/vite.config.js` (or a
separate `vitest.config.js`) with `environment: 'jsdom'` and a setup
file that imports `@testing-library/jest-dom`; set
`web/package.json`'s `"test"` script to `"vitest run"` (explicit
run-once mode, not watch mode, so `npm test` behaves correctly in CI
and locally).
- Verify: `npm test` in `web/` runs (reports "no test files found" is
  acceptable at this point, since no test files exist yet).

### Cross-cutting

**T14 — Full local end-to-end smoke check.** *(AC-2, AC-3, AC-4)*
With both `dotnet run --project api` and `npm run dev` (in `web/`)
running simultaneously: confirm the page shows "Hello World" with no
CORS errors in the browser console (AC-2, AC-3); then stop the API and
reload the page, confirming the legible error state appears with no
unhandled exception (AC-4).
- Verify: manual browser check per above; this task is a checkpoint,
  not new code.

---

## 4. Test Strategy

Per this repo's convention (`.claude/agents/tester.md`), test *files*
are written by the tester agent against the implementation produced
from the tasks above, one automated test per acceptance criterion at
minimum. This section defines what those tests should cover and where.

### API — xUnit in `api/tests` (uses `WebApplicationFactory<Program>`, enabled by T2)

| Test | Verifies | Maps to |
|---|---|---|
| `GET /api/message` returns HTTP 200 | status code | AC-1 / FR-1, FR-2 |
| `GET /api/message` response body deserializes to `{ "message": "Hello World" }` | exact payload/shape | AC-1 / FR-2 |
| `GET /api/message` response `Content-Type` is `application/json` | content type | AC-1 / FR-2 |
| A request with an `Origin: http://localhost:5173` header receives an `Access-Control-Allow-Origin` response header matching that origin | CORS is actually configured, not just "no error" | AC-2 / FR-3 |

These are integration-style tests against the in-memory `TestServer`
(via `WebApplicationFactory`), not pure unit tests, since the behavior
under test (routing, JSON serialization, CORS middleware) is
inherently about how the ASP.NET Core pipeline is wired — this matches
the tester agent's stated approach.

### Web — Vitest + React Testing Library in `web/` (harness from T13)

| Test | Verifies | Maps to |
|---|---|---|
| Render `<App />` with `fetchMessage`/`fetch` mocked to resolve `{ message: "Hello World" }`; assert the text "Hello World" appears | fetch-on-mount + render of fetched message | AC-3 / FR-4, FR-5 |
| Render `<App />` with the mock configured to reject (simulated network error); assert the legible error text appears and no test failure occurs from an unhandled rejection | error handling on network failure | AC-4 / FR-6 |
| Render `<App />` with the mock configured to resolve a non-2xx response; assert the same legible error text appears | error handling on non-2xx API response | AC-4 / FR-6 |

Mocking should target `web/src/api.js`'s `fetchMessage` (or the global
`fetch`) so tests do not depend on a real running API — consistent with
the tester agent's instruction to "mock the API call."

### Mapping acceptance criteria to test coverage (summary)

- **AC-1** → API tests (status code + body).
- **AC-2** → API test (CORS response header) + T14 manual smoke check (real browser behavior is the ultimate authority for "browser does not block the request," which an in-memory `TestServer` test can only approximate).
- **AC-3** → Web test (renders fetched message) + T14 manual smoke check.
- **AC-4** → Web tests (error text on network failure and on non-2xx) + T14 manual smoke check.
- **AC-5** → Satisfied by the existence and passing state of the above test suites, run via `dotnet test` and `npm test` respectively (already exercised by `ci.yml`).

---

## 5. File-by-File Breakdown

### New files — API

| File | Purpose |
|---|---|
| `api/api.csproj` | Minimal Web API project file, `net10.0`. |
| `api/api.sln` | Solution referencing `api/api.csproj` and `api/tests/Api.Tests.csproj`, so `dotnet build`/`dotnet test` work with no explicit argument from `api/` (per Task 4 / Ambiguity A1). |
| `api/Program.cs` | App bootstrap: `WebApplicationBuilder`, CORS policy registration, `GET /api/message` route mapping, trailing `public partial class Program { }` for testability. |
| `api/appsettings.json` | Base configuration (e.g. default `Cors:AllowedOrigin` key present but empty/placeholder). |
| `api/appsettings.Development.json` | Dev override: `Cors:AllowedOrigin = http://localhost:5173`. |
| `api/Properties/launchSettings.json` | Ensures the default `dotnet run --project api` profile serves `http://localhost:5000`. |
| `api/.gitignore` | Standard .NET ignores (`bin/`, `obj/`) — generated by `dotnet new`. |
| `api/tests/Api.Tests.csproj` | xUnit test project, references `Microsoft.AspNetCore.Mvc.Testing` and `api/api.csproj`. |
| `api/tests/MessageEndpointTests.cs` | *(written by tester agent)* Endpoint status/body/CORS tests per Section 4. |

### New files — Web

| File | Purpose |
|---|---|
| `web/package.json` | Scripts (`dev`, `build`, `test` = `vitest run`), dependencies (`react`, `react-dom`, `vite`) and devDependencies (`vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`). |
| `web/package-lock.json` | Committed for CI's `npm ci` step and reproducible installs. |
| `web/vite.config.js` (or `web/vitest.config.js`) | Vite build config plus Vitest `test` block (`environment: 'jsdom'`, setup file). |
| `web/index.html` | Vite entry HTML. |
| `web/src/main.jsx` | React root render entry point. |
| `web/src/App.jsx` | Fetch-on-mount logic (via `src/api.js`), loading/success/error rendering. |
| `web/src/api.js` | `fetchMessage()` — isolates the network call so it's easy to mock in tests. |
| `web/src/index.css` / `web/src/App.css` | Trimmed, high-contrast minimal styling (NFR-1). |
| `web/src/setupTests.js` | Imports `@testing-library/jest-dom` matchers for Vitest. |
| `web/.env.development` | `VITE_API_BASE_URL=http://localhost:5000` (optional convenience; code also has this as a fallback default — see Ambiguity A3). |
| `web/.gitignore` | Standard Vite ignores (`node_modules/`, `dist/`) — generated by the scaffold tool. |
| `web/src/App.test.jsx` | *(written by tester agent)* Render/fetch/error-state tests per Section 4. |

### Existing files — not changed by this plan

- `.github/workflows/ci.yml` — expected to work unmodified against the
  layout above (this is the reason for Task 4's early verification).
- `.github/workflows/deploy.yml` — deployment is out of scope (Ambiguity A7); not touched.
- `CLAUDE.md`, `docs/requirements.md` — reference documents only.

### Not created

- No `api/Controllers/`, no Swagger/OpenAPI, no database/EF, no auth
  packages, no additional endpoints — all explicitly out of scope.
- No TypeScript config (see Ambiguity A5).
