import { useEffect, useState } from 'react'
import { fetchMessage } from './api'
import './App.css'

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

  useEffect(() => {
    let cancelled = false

    fetchMessage()
      .then((result) => {
        if (cancelled) return
        setData({ message: result.message, timestampUtc: result.timestampUtc })
        setStatus('success')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="app">
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
