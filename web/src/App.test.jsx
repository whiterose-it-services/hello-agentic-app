import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { fetchMessage } from './api'

vi.mock('./api')

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

describe('App', () => {
  // AC-3 / FR-4, FR-5: fetches on mount and renders the fetched message.
  it('renders the fetched message on success', async () => {
    fetchMessage.mockResolvedValueOnce({ message: 'Hello World' })

    render(<App />)

    expect(await screen.findByText('Hello World')).toBeInTheDocument()
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

    resolvePromise({ message: 'Hello World' })
    await waitFor(() => expect(screen.getByText('Hello World')).toBeInTheDocument())
  })
})
