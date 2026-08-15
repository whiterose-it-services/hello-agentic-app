import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { fetchMessage } from './api'

vi.mock('./api')

// Mirrors the formatting logic in App.jsx's formatTimestampUtc so the test
// doesn't hardcode a locale-formatted time string that could be fragile
// across environments/ICU versions.
const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
  timeZone: 'UTC',
})
function formatTimestampUtc(timestampUtc) {
  return `${timeFormatter.format(new Date(timestampUtc))} UTC`
}

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

describe('App', () => {
  // AC-3 / FR-4, FR-5: fetches on mount and renders the fetched message.
  // Spec: web-message-display "Successful fetch renders message and timestamp together"
  it('renders the fetched message and a UTC-labeled timestamp on success', async () => {
    const timestampUtc = '2026-08-15T16:37:58Z'
    fetchMessage.mockResolvedValueOnce({ message: 'Hello World', timestampUtc })

    render(<App />)

    const expectedTime = formatTimestampUtc(timestampUtc)
    const message = await screen.findByText(
      (_, element) =>
        element?.tagName.toLowerCase() === 'p' &&
        element.textContent === `Hello World, it is currently ${expectedTime}`,
    )
    expect(message).toBeInTheDocument()
    expect(message.textContent).toContain('Hello World')
    expect(message.textContent).toMatch(/\d{1,2}:\d{2}:\d{2}\s?(AM|PM)\s?UTC/)
  })

  // AC-4 / FR-6: network error is handled without an unhandled rejection,
  // and a legible error message is rendered.
  it('renders a legible error message when the fetch rejects with a network error', async () => {
    fetchMessage.mockRejectedValueOnce(new Error('Network error'))

    render(<App />)

    const alert = await screen.findByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent(/unable to load message/i)
  })

  // AC-4 / FR-6: non-2xx API response is handled and the same error text renders.
  it('renders a legible error message when the API responds with a non-2xx status', async () => {
    fetchMessage.mockRejectedValueOnce(new Error('Failed to fetch message: 500 Internal Server Error'))

    render(<App />)

    const alert = await screen.findByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent(/unable to load message/i)
  })

  it('does not leave the page blank while awaiting the response', async () => {
    let resolvePromise
    fetchMessage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve
        }),
    )

    render(<App />)

    expect(screen.getByText(/loading message/i)).toBeInTheDocument()

    resolvePromise({ message: 'Hello World', timestampUtc: '2026-08-15T16:41:54.639Z' })
    await waitFor(() =>
      expect(
        screen.getByText(
          (_, element) => element?.tagName.toLowerCase() === 'p' && Boolean(element.textContent?.includes('Hello World')),
        ),
      ).toBeInTheDocument(),
    )
  })
})
