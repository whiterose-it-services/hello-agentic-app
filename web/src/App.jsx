import { useEffect, useState } from 'react'
import { fetchMessage } from './api'
import './App.css'

function App() {
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    fetchMessage()
      .then((data) => {
        if (cancelled) return
        setMessage(data.message)
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
      {status === 'success' && <p className="message">{message}</p>}
      {status === 'error' && (
        <p className="error" role="alert">
          Unable to load message.
        </p>
      )}
    </main>
  )
}

export default App
