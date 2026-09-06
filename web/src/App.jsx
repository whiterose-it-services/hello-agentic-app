import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchMessage } from './api'
import './App.css'

// Mirrors the API's MaxNameLength so the browser stops over-long input before
// it becomes a rejected request. The API remains the authority.
const MAX_NAME_LENGTH = 50

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
  timeZone: 'UTC',
})

/**
 * Formats an ISO 8601 UTC timestamp string as a readable clock time with an
 * explicit "UTC" suffix, e.g. "4:37:58 PM UTC".
 * @param {string} timestampUtc
 * @returns {string}
 */
function formatTimestampUtc(timestampUtc) {
  return `${timeFormatter.format(new Date(timestampUtc))} UTC`
}

function App() {
  const [status, setStatus] = useState('loading')
  const [data, setData] = useState({ message: '', timestampUtc: '' })
  const [name, setName] = useState('')
  const latestRequestRef = useRef(0)

  // Both the initial load and every submit funnel through here, so there is a
  // single status machine. Starting a new request invalidates any older one's
  // state writes, so the newest request wins even if an earlier response lands
  // last. The returned function cancels this request (used as effect cleanup).
  const load = useCallback((requestedName) => {
    const requestId = latestRequestRef.current + 1
    latestRequestRef.current = requestId

    const cancelled = () => latestRequestRef.current !== requestId

    setStatus('loading')

    fetchMessage(requestedName)
      .then((result) => {
        if (cancelled()) return
        setData({ message: result.message, timestampUtc: result.timestampUtc })
        setStatus('success')
      })
      .catch(() => {
        if (cancelled()) return
        setStatus('error')
      })

    return () => {
      if (!cancelled()) latestRequestRef.current = requestId + 1
    }
  }, [])

  useEffect(() => load(), [load])

  const handleSubmit = (event) => {
    event.preventDefault()
    load(name)
  }

  return (
    <main className="app">
      <form className="name-form" onSubmit={handleSubmit}>
        <label className="name-label" htmlFor="name">
          Your name
        </label>
        <input
          className="name-input"
          id="name"
          name="name"
          type="text"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="off"
          onChange={(event) => setName(event.target.value)}
        />
        <button className="name-submit" type="submit">
          Say hello
        </button>
      </form>

      {status === 'loading' && <p>Loading message...</p>}
      {status === 'success' && (
        <p className="message">
          {data.message}, it is currently {formatTimestampUtc(data.timestampUtc)}
        </p>
      )}
      {status === 'error' && (
        <p className="error" role="alert">
          Unable to load message.
        </p>
      )}
    </main>
  )
}

export default App
