## 1. API: optional name on GET /api/message

- [x] 1.1 Add a `MaxNameLength` constant (50) in `api/Program.cs`
- [x] 1.2 Change the `/api/message` handler to bind an optional `string? name` from the query string
- [x] 1.3 Trim `name`; if it is null or whitespace-only, keep returning `message` = `"Hello World"`
- [x] 1.4 If the trimmed `name` exceeds `MaxNameLength`, return `Results.BadRequest()` without including the supplied value in the response
- [x] 1.5 Otherwise return `message` = `"Hello "` + trimmed name, with `timestampUtc` unchanged in behavior

## 2. API tests

- [x] 2.1 Add a test: `GET /api/message?name=Ada` returns 200 with `message` = `"Hello Ada"`
- [x] 2.2 Add a test: a name with surrounding whitespace is trimmed in the message
- [x] 2.3 Add tests: omitted, empty, and whitespace-only `name` all return `"Hello World"`
- [x] 2.4 Add a test: a 50-character name returns 200 and includes the name
- [x] 2.5 Add a test: a 51-character name returns 400 and the body does not contain the supplied name
- [x] 2.6 Confirm the existing no-name and timestamp tests still pass unchanged (`dotnet test`)

## 3. Web: pass the name to the API

- [x] 3.1 Change `fetchMessage` in `web/src/api.js` to accept an optional name argument
- [x] 3.2 Build the query string with `URLSearchParams` only when the name is non-blank, so a blank/absent name requests the bare `/api/message`

## 4. Web: textbox and submit

- [x] 4.1 In `web/src/App.jsx`, extract the fetch into a single `load(name)` callback that drives the existing `loading` / `success` / `error` status, keeping the `cancelled` guard so a newer call invalidates an older one's state writes
- [x] 4.2 Have the initial `useEffect` call `load()` with no name so first load stays unpersonalized
- [x] 4.3 Add controlled state for the input value, starting empty
- [x] 4.4 Render a `<form>` containing a labelled `<input type="text">` (label associated via `htmlFor`/`id`, `maxLength` set to 50) and a submit `<button>` with a clear accessible name
- [x] 4.5 On form submit, prevent default and call `load(value)` so Enter and the button share one path
- [x] 4.6 Keep the form visible in all three states so the user can resubmit after an error
- [x] 4.7 Style the form in `web/src/App.css` consistently with the existing message styling

## 5. Web tests

- [x] 5.1 Add a test in `web/src/api.test.js`: `fetchMessage('Ada')` requests the URL with an encoded `name` query parameter
- [x] 5.2 Add a test: `fetchMessage()` and `fetchMessage('   ')` request `/api/message` with no query string
- [x] 5.3 Add a test in `web/src/App.test.jsx`: typing a name and clicking submit calls the API with that name and renders the returned message
- [x] 5.4 Add a test: pressing Enter in the input submits the same way
- [x] 5.5 Add a test: the input is findable by its label and the submit button by its accessible name, and the input is empty on load
- [x] 5.6 Add a test: submitting with an empty input calls the API with no name
- [x] 5.7 Add a test: a failed re-fetch shows the error message rather than the previous greeting
- [x] 5.8 Confirm existing initial-load and timestamp-rendering tests still pass (`npm test` in `web/`)

## 6. Verify end to end

- [x] 6.1 Run `dotnet test` and `npm test` — all green
- [ ] 6.2 Run the API and web app, submit a name, and confirm the greeting updates with the name and a fresh UTC timestamp
  - API half verified live: `/api/message` → `"Hello World"`, `?name=Ada+Lovelace` → `"Hello Ada Lovelace"`, 51-char name → 400, all with a fresh `timestampUtc`. The browser submit-and-render path is covered by the web test suite but was not exercised in a real browser.
