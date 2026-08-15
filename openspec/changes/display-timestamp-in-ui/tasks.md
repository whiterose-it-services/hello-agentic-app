## 1. Web implementation

- [x] 1.1 Add a formatting helper in `web/src/App.jsx` (or a small util) that renders `timestampUtc` as a readable time string with an explicit UTC label, using `Intl.DateTimeFormat` with `timeZone: 'UTC'`
- [x] 1.2 Update the success-state render to combine `message` and the formatted timestamp into one sentence, e.g. "Hello World, it is currently 4:37:58 PM UTC"
- [x] 1.3 Run `npm run dev`, confirm visually against the running API that the combined message renders correctly and the loading/error states are unaffected
