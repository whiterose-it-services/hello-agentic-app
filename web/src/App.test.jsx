import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

// Helpers shared by the name-input tests below.
const nameInput = () => screen.getByLabelText(/your name/i)
const submitButton = () => screen.getByRole('button', { name: /say hello/i })
const greeting = (text) =>
  screen.findByText(
    (_, element) => element?.tagName.toLowerCase() === 'p' && Boolean(element.textContent?.startsWith(text)),
  )

describe('App name input', () => {
  // Spec: web-message-display "Input is labelled" and "First load".
  it('renders an empty labelled input and a named submit control on load', async () => {
    fetchMessage.mockResolvedValueOnce({ message: 'Hello World', timestampUtc: '2026-08-15T16:37:58Z' })

    render(<App />)

    const input = nameInput()
    expect(input).toBeInTheDocument()
    expect(input.tagName.toLowerCase()).toBe('input')
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveValue('')
    expect(submitButton()).toBeInTheDocument()

    // Spec: "First load" — the initial fetch supplies no name.
    await greeting('Hello World')
    expect(fetchMessage).toHaveBeenCalledTimes(1)
    expect(fetchMessage.mock.calls[0][0] ?? '').toBe('')
  })

  // Spec: "Input is labelled" — getByLabelText alone also passes for an
  // aria-label with no visible text, so assert the stronger thing the scenario
  // asks for: a real <label> element with visible text, programmatically
  // associated with a single-line text input, plus an accessibly-named submit
  // control.
  it('associates a visible label element with the single-line text input', async () => {
    fetchMessage.mockResolvedValueOnce({ message: 'Hello World', timestampUtc: '2026-08-15T16:37:58Z' })

    render(<App />)

    const input = nameInput()
    expect(input.tagName.toLowerCase()).toBe('input')
    expect(input).toHaveAttribute('type', 'text')
    expect(input.id).toBeTruthy()

    // A visible <label for="..."> pointing at the input.
    const label = document.querySelector(`label[for="${input.id}"]`)
    expect(label).not.toBeNull()
    expect(label).toBeVisible()
    expect(label.textContent.trim().length).toBeGreaterThan(0)

    // The accessible name of the input comes from that visible label text.
    expect(screen.getByLabelText(label.textContent.trim())).toBe(input)

    // The submit control is a button with a non-empty accessible name.
    const button = submitButton()
    expect(button.tagName.toLowerCase()).toBe('button')
    expect(button).toBeVisible()
    expect(button).toHaveAccessibleName(/say hello/i)

    await greeting('Hello World')
  })

  // Spec: "Submitting a name fetches a personalized message".
  it('submits the typed name on button click and renders the returned message', async () => {
    fetchMessage
      .mockResolvedValueOnce({ message: 'Hello World', timestampUtc: '2026-08-15T16:37:58Z' })
      .mockResolvedValueOnce({ message: 'Hello Ada', timestampUtc: '2026-08-15T16:38:20Z' })

    render(<App />)
    await greeting('Hello World')

    fireEvent.change(nameInput(), { target: { value: 'Ada' } })
    fireEvent.click(submitButton())

    expect(fetchMessage).toHaveBeenLastCalledWith('Ada')
    const message = await greeting('Hello Ada')
    expect(message.textContent).toContain('Hello Ada')
    expect(message.textContent).toMatch(/\d{1,2}:\d{2}:\d{2}\s?(AM|PM)\s?UTC/)
  })

  // Spec: "Pressing Enter submits". Enter-to-submit is provided by native form
  // semantics (design decision 6) rather than a keydown handler, and jsdom does
  // not implement implicit form submission, so this asserts both that the
  // markup supports it (a text input and a type="submit" button inside one
  // <form>) and that the resulting submit event re-fetches with the name.
  it('submits the typed name when the form is submitted from the input (Enter)', async () => {
    fetchMessage
      .mockResolvedValueOnce({ message: 'Hello World', timestampUtc: '2026-08-15T16:37:58Z' })
      .mockResolvedValueOnce({ message: 'Hello Ada', timestampUtc: '2026-08-15T16:38:20Z' })

    render(<App />)
    await greeting('Hello World')

    const input = nameInput()
    const form = input.closest('form')
    expect(form).not.toBeNull()
    expect(submitButton()).toHaveAttribute('type', 'submit')
    expect(form).toContainElement(submitButton())

    fireEvent.change(input, { target: { value: 'Ada' } })
    fireEvent.submit(form)

    expect(fetchMessage).toHaveBeenLastCalledWith('Ada')
    await greeting('Hello Ada')
  })

  // Spec: "Pressing Enter submits". The test above dispatches a synthetic
  // submit event, which proves the handler is wired to onSubmit but assumes
  // rather than demonstrates that Enter reaches it. This drives a real
  // keyboard: user-event types the characters and presses Enter with focus in
  // the input, performing implicit form submission the way a browser does. If
  // Enter-to-submit were implemented by, say, a click handler on the button
  // only, this test would fail where the fireEvent.submit one still passes.
  it('submits the typed name when Enter is pressed with the input focused', async () => {
    const user = userEvent.setup()
    fetchMessage
      .mockResolvedValueOnce({ message: 'Hello World', timestampUtc: '2026-08-15T16:37:58Z' })
      .mockResolvedValueOnce({ message: 'Hello Ada', timestampUtc: '2026-08-15T16:38:20Z' })

    render(<App />)
    await greeting('Hello World')

    await user.click(nameInput())
    expect(nameInput()).toHaveFocus()
    await user.keyboard('Ada')
    expect(nameInput()).toHaveValue('Ada')

    await user.keyboard('{Enter}')

    await waitFor(() => expect(fetchMessage).toHaveBeenCalledTimes(2))
    expect(fetchMessage).toHaveBeenLastCalledWith('Ada')
    await greeting('Hello Ada')
  })

  // Spec: "Pressing Enter submits" — Enter must not reload the page or lose the
  // typed value, i.e. the submit event is default-prevented. A native
  // unprevented submit in jsdom logs "Not implemented: HTMLFormElement.prototype
  // .requestSubmit"; assert the input keeps its value and no navigation error
  // surfaced instead of relying on that log.
  it('does not navigate away or clear the input when Enter submits', async () => {
    const user = userEvent.setup()
    fetchMessage
      .mockResolvedValueOnce({ message: 'Hello World', timestampUtc: '2026-08-15T16:37:58Z' })
      .mockResolvedValueOnce({ message: 'Hello Ada', timestampUtc: '2026-08-15T16:38:20Z' })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)
    await greeting('Hello World')

    await user.click(nameInput())
    await user.keyboard('Ada{Enter}')
    await greeting('Hello Ada')

    // The typed name survives the submit, so the user can tweak and resubmit.
    expect(nameInput()).toHaveValue('Ada')
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  // The `+`-encoding trap: URLSearchParams serialises a space as "+", so a name
  // typed with a space is the case most likely to come back wrong. The web
  // app's contract is to hand fetchMessage the raw typed value (encoding is
  // api.js's job) and to render whatever message the API returns verbatim.
  it('passes a name containing spaces through verbatim and renders the returned greeting', async () => {
    const user = userEvent.setup()
    fetchMessage
      .mockResolvedValueOnce({ message: 'Hello World', timestampUtc: '2026-08-15T16:37:58Z' })
      .mockResolvedValueOnce({ message: 'Hello Ada Lovelace', timestampUtc: '2026-08-15T16:38:20Z' })

    render(<App />)
    await greeting('Hello World')

    await user.type(nameInput(), 'Ada Lovelace')
    await user.click(submitButton())

    await waitFor(() => expect(fetchMessage).toHaveBeenCalledTimes(2))
    expect(fetchMessage).toHaveBeenLastCalledWith('Ada Lovelace')
    // Not "Ada+Lovelace": the raw value goes to the api layer, unencoded.
    expect(fetchMessage.mock.calls[1][0]).not.toContain('+')

    const message = await greeting('Hello Ada Lovelace')
    expect(message.textContent).toContain('Hello Ada Lovelace')
    expect(message.textContent).not.toContain('+')
  })

  // Spec: "Submitting a name fetches a personalized message" driven with a real
  // keyboard and pointer rather than a synthetic change event, so per-keystroke
  // controlled-input handling is exercised too.
  it('submits a name typed keystroke by keystroke and clicked with a real pointer', async () => {
    const user = userEvent.setup()
    fetchMessage
      .mockResolvedValueOnce({ message: 'Hello World', timestampUtc: '2026-08-15T16:37:58Z' })
      .mockResolvedValueOnce({ message: 'Hello Grace', timestampUtc: '2026-08-15T16:38:20Z' })

    render(<App />)
    await greeting('Hello World')

    await user.type(nameInput(), 'Grace')
    expect(nameInput()).toHaveValue('Grace')

    await user.click(submitButton())

    await waitFor(() => expect(fetchMessage).toHaveBeenCalledTimes(2))
    expect(fetchMessage).toHaveBeenLastCalledWith('Grace')
    await greeting('Hello Grace')
  })

  // Spec: "Submitting an empty input" — an empty input must request the
  // unpersonalized message. Blank and absent are equivalent at this boundary:
  // api.js turns both into the bare /api/message URL.
  it('requests the message without a name when the input is empty', async () => {
    fetchMessage
      .mockResolvedValueOnce({ message: 'Hello World', timestampUtc: '2026-08-15T16:37:58Z' })
      .mockResolvedValueOnce({ message: 'Hello World', timestampUtc: '2026-08-15T16:39:11Z' })

    render(<App />)
    await greeting('Hello World')

    fireEvent.click(submitButton())

    expect(fetchMessage).toHaveBeenCalledTimes(2)
    expect(fetchMessage.mock.calls[1][0] ?? '').toMatch(/^\s*$/)
    await greeting('Hello World')
  })

  // Spec: "Re-fetch in progress" — the page says it is loading while a
  // submitted re-fetch is in flight.
  it('indicates loading while a submitted re-fetch is in flight', async () => {
    let resolveSecond
    fetchMessage
      .mockResolvedValueOnce({ message: 'Hello World', timestampUtc: '2026-08-15T16:37:58Z' })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve
          }),
      )

    render(<App />)
    await greeting('Hello World')

    fireEvent.change(nameInput(), { target: { value: 'Ada' } })
    fireEvent.click(submitButton())

    expect(screen.getByText(/loading message/i)).toBeInTheDocument()

    resolveSecond({ message: 'Hello Ada', timestampUtc: '2026-08-15T16:40:02Z' })
    await greeting('Hello Ada')
  })

  // Spec: "Re-fetch fails" — the error replaces the previous greeting rather
  // than leaving it on screen as if it were the new result. The form stays
  // visible so the user can resubmit (task 4.6).
  it('shows the error message instead of the previous greeting when a re-fetch fails', async () => {
    fetchMessage
      .mockResolvedValueOnce({ message: 'Hello World', timestampUtc: '2026-08-15T16:37:58Z' })
      .mockRejectedValueOnce(new Error('Network error'))

    render(<App />)
    await greeting('Hello World')

    fireEvent.change(nameInput(), { target: { value: 'Ada' } })
    fireEvent.click(submitButton())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/unable to load message/i)
    expect(screen.queryByText(/Hello World/)).not.toBeInTheDocument()
    expect(nameInput()).toBeInTheDocument()
    expect(submitButton()).toBeInTheDocument()
  })

  // Spec: "Re-fetch fails" — hardening of the test above. A distinctive first
  // greeting plus its rendered timestamp are checked to be gone from the whole
  // document body, so a stale greeting cannot survive anywhere on the page
  // (e.g. dimmed, or in a second paragraph alongside the error).
  it('removes the previous greeting and its timestamp entirely when a re-fetch fails', async () => {
    const user = userEvent.setup()
    const firstTimestamp = '2026-08-15T16:37:58Z'
    fetchMessage
      .mockResolvedValueOnce({ message: 'Hello Zaphod', timestampUtc: firstTimestamp })
      .mockRejectedValueOnce(new Error('Network error'))

    render(<App />)
    const first = await greeting('Hello Zaphod')
    const renderedTime = formatTimestampUtc(firstTimestamp)
    expect(first.textContent).toContain(renderedTime)

    await user.type(nameInput(), 'Ada')
    await user.click(submitButton())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/unable to load message/i)

    // Nothing anywhere in the document still shows the old result.
    expect(document.body.textContent).not.toContain('Hello Zaphod')
    expect(document.body.textContent).not.toContain(renderedTime)
    expect(document.body.textContent).not.toContain('it is currently')
    expect(screen.queryByText(/Hello/)).not.toBeInTheDocument()
  })

  // Spec: "Re-fetch fails" — a failed re-fetch must not be a dead end: the user
  // can resubmit and a subsequent success replaces the error.
  it('recovers when a resubmit after a failed re-fetch succeeds', async () => {
    const user = userEvent.setup()
    fetchMessage
      .mockResolvedValueOnce({ message: 'Hello World', timestampUtc: '2026-08-15T16:37:58Z' })
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ message: 'Hello Ada', timestampUtc: '2026-08-15T16:39:00Z' })

    render(<App />)
    await greeting('Hello World')

    await user.type(nameInput(), 'Ada')
    await user.click(submitButton())
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.click(submitButton())

    await greeting('Hello Ada')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  // Spec: "Re-fetch in progress" — hardening. As well as showing the loading
  // indicator, the page must not simultaneously present the previous greeting
  // as if it were the new result (design decision 5 / accepted trade-off).
  it('replaces the previous greeting with the loading indicator during a re-fetch', async () => {
    let resolveSecond
    fetchMessage
      .mockResolvedValueOnce({ message: 'Hello Zaphod', timestampUtc: '2026-08-15T16:37:58Z' })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve
          }),
      )

    render(<App />)
    await greeting('Hello Zaphod')

    fireEvent.change(nameInput(), { target: { value: 'Ada' } })
    fireEvent.click(submitButton())

    expect(screen.getByText(/loading message/i)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Hello Zaphod')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    // The form stays usable while the request is in flight.
    expect(nameInput()).toBeInTheDocument()
    expect(submitButton()).toBeInTheDocument()

    resolveSecond({ message: 'Hello Ada', timestampUtc: '2026-08-15T16:40:02Z' })
    await greeting('Hello Ada')
  })

  // Spec: "Submitting an empty input" — driven through the UI: type a name,
  // clear it, submit. The request must carry no name and the unpersonalized
  // message the API returns must be displayed.
  it('requests the unpersonalized message after the user clears the input', async () => {
    const user = userEvent.setup()
    fetchMessage
      .mockResolvedValueOnce({ message: 'Hello World', timestampUtc: '2026-08-15T16:37:58Z' })
      .mockResolvedValueOnce({ message: 'Hello Ada', timestampUtc: '2026-08-15T16:38:20Z' })
      .mockResolvedValueOnce({ message: 'Hello World', timestampUtc: '2026-08-15T16:39:11Z' })

    render(<App />)
    await greeting('Hello World')

    await user.type(nameInput(), 'Ada')
    await user.click(submitButton())
    await greeting('Hello Ada')

    await user.clear(nameInput())
    expect(nameInput()).toHaveValue('')
    await user.click(submitButton())

    await waitFor(() => expect(fetchMessage).toHaveBeenCalledTimes(3))
    expect(fetchMessage.mock.calls[2][0] ?? '').toMatch(/^\s*$/)

    const message = await greeting('Hello World')
    expect(message.textContent).toContain('Hello World')
    expect(message.textContent).not.toContain('Ada')
  })

  // Design decision 5 / risk "rapid resubmits could race": the newest submit
  // must win even if an earlier response lands last, otherwise a stale greeting
  // is presented as the result of the latest submit ("Re-fetch outcome is
  // visible").
  it('shows the newest submission result when an earlier response lands last', async () => {
    let resolveFirstSubmit
    let resolveSecondSubmit
    fetchMessage
      .mockResolvedValueOnce({ message: 'Hello World', timestampUtc: '2026-08-15T16:37:58Z' })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirstSubmit = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecondSubmit = resolve }))

    render(<App />)
    await greeting('Hello World')

    fireEvent.change(nameInput(), { target: { value: 'Ada' } })
    fireEvent.click(submitButton())
    fireEvent.change(nameInput(), { target: { value: 'Grace' } })
    fireEvent.click(submitButton())

    expect(fetchMessage).toHaveBeenCalledTimes(3)
    expect(fetchMessage.mock.calls[1][0]).toBe('Ada')
    expect(fetchMessage.mock.calls[2][0]).toBe('Grace')

    // The newest request resolves first, then the stale one lands.
    resolveSecondSubmit({ message: 'Hello Grace', timestampUtc: '2026-08-15T16:40:02Z' })
    await greeting('Hello Grace')

    resolveFirstSubmit({ message: 'Hello Ada', timestampUtc: '2026-08-15T16:39:02Z' })
    await waitFor(() => expect(document.body.textContent).toContain('Hello Grace'))
    expect(document.body.textContent).not.toContain('Hello Ada')
  })
})
