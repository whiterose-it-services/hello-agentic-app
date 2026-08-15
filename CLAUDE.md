# Project: hello-agentic-app

A React front end that displays a message fetched from a .NET Web API.

## Structure
- `api/` — .NET 10 minimal Web API. Endpoint: GET /api/message returns { "message": "Hello World" }.
- `web/` — React app (Vite). Fetches /api/message on load and renders the message.
- `docs/` — requirements.md and plan.md from the initial feature (historical; superseded by OpenSpec going forward).
- `openspec/` — spec-driven planning for new features. `specs/` holds the living spec of current behavior; `changes/` holds in-flight change proposals (proposal.md, spec deltas, design.md, tasks.md); `changes/archive/` holds completed ones. Workflow: `/opsx:propose`, `/opsx:apply`, `/opsx:archive`.

## Conventions
- Branch naming: feature/<short-description>
- Never commit directly to main. All changes go through a PR.
- API tests: xUnit in api/tests. Web tests: Vitest + React Testing Library.
- The API must enable CORS for the web app's origin.
- Do not add authentication, databases, or extra endpoints unless requirements say so.

## Commands
- API: `dotnet run --project api` (serves on http://localhost:5000)
- API tests: `dotnet test`
- Web: `npm run dev` in web/ ; Web tests: `npm test` in web/