# Requirements: Display API Message in Web App

## 1. Overview

The hello-agentic-app currently has no implemented API or web front end. This
feature scaffolds a minimal .NET 10 Web API (`api/`) that exposes a single
endpoint returning a greeting message, and a React (Vite) web app (`web/`)
that fetches this message when the page loads and displays it to the user.
The goal is to establish a working end-to-end slice — API to browser — that
demonstrates the two projects communicating, without adding authentication,
persistence, or functionality beyond what is explicitly requested.

## 2. Functional Requirements

- **FR-1**: The API shall expose an HTTP GET endpoint at `/api/message`.
- **FR-2**: The `/api/message` endpoint shall return HTTP 200 with a JSON
  body of the form `{ "message": "Hello World" }`.
- **FR-3**: The API shall enable CORS to allow requests from the web app's
  origin.
- **FR-4**: On initial page load, the React web app shall issue a request
  to the API's `/api/message` endpoint.
- **FR-5**: The web app shall render the value of the `message` field from
  the API response as visible text on the page.
- **FR-6**: If the API request fails (network error or non-2xx response),
  the web app shall render a legible message on the page indicating the
  message could not be loaded, instead of leaving the page blank or
  throwing an unhandled error.

## 3. Non-Functional Requirements

- **NFR-1 (Legibility)**: The rendered message and any error state must be
  legible (readable plain text with sufficient contrast); no specific visual
  design, branding, or styling framework is required.
- **NFR-2 (Testability)**: The API endpoint shall be covered by xUnit tests
  in `api/tests`; the web app's fetch-and-render behavior shall be covered
  by Vitest + React Testing Library tests in `web/`.
- **NFR-3 (Local runnability)**: The API must be runnable locally via
  `dotnet run --project api` on `http://localhost:5000`, and the web app via
  `npm run dev` in `web/`, per the commands documented in CLAUDE.md.

## 4. Out of Scope

- Authentication or authorization of any kind.
- A database or any persistent storage.
- Any API endpoints other than `GET /api/message`.
- Configurable or dynamic message content (e.g., via query params, request
  body, or admin interface).
- Visual design system, theming, responsive layout, or branding beyond
  basic legibility.
- Deployment, CI/CD pipeline configuration, or hosting infrastructure.
- Internationalization/localization of the message.
- Retry logic, caching, or loading spinners beyond a simple error message
  on failure (FR-6).

## 5. Acceptance Criteria

**AC-1 (maps to FR-1, FR-2)**
- Given the API is running
- When a client sends `GET /api/message`
- Then the response has HTTP status 200 and a JSON body equal to
  `{ "message": "Hello World" }`

**AC-2 (maps to FR-3)**
- Given the API is running and CORS is configured for the web app's origin
- When the web app (running on its configured origin) sends a `GET` request
  to `/api/message` from the browser
- Then the browser does not block the request or response due to CORS
  policy

**AC-3 (maps to FR-4, FR-5)**
- Given the web app is loaded in a browser and the API is reachable
- When the page finishes loading
- Then a GET request to `/api/message` is made automatically, and the text
  "Hello World" is visible on the rendered page

**AC-4 (maps to FR-6)**
- Given the web app is loaded in a browser and the API is unreachable or
  returns an error
- When the page attempts to fetch `/api/message`
- Then the page displays a legible message indicating the data could not be
  loaded, and no unhandled exception is thrown

**AC-5 (maps to NFR-2)**
- Given the API and web codebases
- When the test suites are run (`dotnet test` for the API, `npm test` in
  `web/`)
- Then xUnit tests verify the `/api/message` endpoint's status code and
  response body, and Vitest + React Testing Library tests verify the web
  app renders the fetched message (and the error state on failure)
