import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchMessage } from './api'

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Stubs global fetch with a successful JSON response and returns the mock so
 * tests can assert on the requested URL.
 */
function stubFetchOk(body = { message: 'Hello World', timestampUtc: '2026-08-15T15:55:02Z' }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(body),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** The single URL fetch was called with. */
function requestedUrl(fetchMock) {
  expect(fetchMock).toHaveBeenCalledTimes(1)
  return fetchMock.mock.calls[0][0]
}

describe('fetchMessage', () => {
  // Reviewer follow-up on PR #7: the API response now includes timestampUtc.
  // fetchMessage() returns response.json() unfiltered, so prove the field
  // survives the fetch/parse layer rather than being silently dropped.
  it('passes the timestampUtc field through from the API response unfiltered', async () => {
    const timestampUtc = '2026-08-15T15:55:02Z'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ message: 'Hello World', timestampUtc }),
      }),
    )

    const data = await fetchMessage()

    expect(data).toHaveProperty('timestampUtc', timestampUtc)
    expect(data.message).toBe('Hello World')
  })

  // Design decision 4: fetchMessage is the single place that knows the request
  // URL, and it appends a non-blank name as a query parameter.
  it('requests the message with the name as a query parameter', async () => {
    const fetchMock = stubFetchOk({ message: 'Hello Ada', timestampUtc: '2026-08-15T15:55:02Z' })

    await fetchMessage('Ada')

    const url = requestedUrl(fetchMock)
    expect(url).toContain('/api/message?')
    expect(new URL(url).searchParams.get('name')).toBe('Ada')
  })

  // URLSearchParams (rather than string concatenation) is used so spaces, "&"
  // and non-ASCII characters survive the round trip encoded, not mangled.
  it('encodes names containing spaces, ampersands and non-ASCII characters', async () => {
    const fetchMock = stubFetchOk()
    const name = 'Ada & Grace Ünïcode'

    await fetchMessage(name)

    const url = requestedUrl(fetchMock)
    expect(url).not.toContain(' ')
    expect(new URL(url).searchParams.get('name')).toBe(name)
  })

  // Pins the wire format for a name containing a space. URLSearchParams
  // serialises spaces as "+", NOT "%20", so this is the exact query string the
  // API receives. The paired API test
  // (GetMessage_WithPlusEncodedSpacesInName_DecodesPlusAsSpace) asserts the
  // server decodes this back to a space; if either side changes, one of the two
  // tests fails and the "Hello Ada+Lovelace" bug cannot appear silently.
  it('serialises a space in the name as "+" in the query string', async () => {
    const fetchMock = stubFetchOk({ message: 'Hello Ada Lovelace', timestampUtc: '2026-08-15T15:55:02Z' })

    await fetchMessage('Ada Lovelace')

    const url = requestedUrl(fetchMock)
    expect(url).toContain('/api/message?name=Ada+Lovelace')
    expect(url).not.toContain('%20')
    // And URLSearchParams parsing agrees the "+" means a space.
    expect(new URL(url).searchParams.get('name')).toBe('Ada Lovelace')
  })

  // A name the user typed with a literal "+" must be percent-encoded as %2B so
  // the API does not read it as a space.
  it('percent-encodes a literal "+" typed in the name as %2B', async () => {
    const fetchMock = stubFetchOk()

    await fetchMessage('Ada+Grace')

    const url = requestedUrl(fetchMock)
    expect(url).toContain('name=Ada%2BGrace')
    expect(new URL(url).searchParams.get('name')).toBe('Ada+Grace')
  })

  // The name is sent as supplied; api.js does not trim or otherwise rewrite it,
  // because the API owns the trimming (message-api "Supplied name has
  // surrounding whitespace").
  it('sends a name with surrounding whitespace through to the API untrimmed', async () => {
    const fetchMock = stubFetchOk({ message: 'Hello Ada Lovelace', timestampUtc: '2026-08-15T15:55:02Z' })

    await fetchMessage('  Ada Lovelace  ')

    const url = requestedUrl(fetchMock)
    expect(url).toContain('?')
    expect(new URL(url).searchParams.get('name')).toBe('  Ada Lovelace  ')
  })

  // Spec boundary: a 50-character name is a normal request, encoded like any
  // other; api.js does not enforce the length itself.
  it('sends a 50-character name as a normal query parameter', async () => {
    const fetchMock = stubFetchOk()
    const name = 'a'.repeat(50)

    await fetchMessage(name)

    const url = requestedUrl(fetchMock)
    expect(new URL(url).searchParams.get('name')).toBe(name)
  })

  // The initial useEffect call passes no name, so the bare URL must be
  // requested and the pre-existing no-name API contract preserved.
  it('requests /api/message with no query string when called with no name', async () => {
    const fetchMock = stubFetchOk()

    await fetchMessage()

    const url = requestedUrl(fetchMock)
    expect(url).not.toContain('?')
    expect(url.endsWith('/api/message')).toBe(true)
  })

  // Design decision 3/4: a whitespace-only name is treated as absent, so the
  // request is identical to the no-name case.
  it('requests /api/message with no query string when the name is only whitespace', async () => {
    const fetchMock = stubFetchOk()

    await fetchMessage('   ')

    const url = requestedUrl(fetchMock)
    expect(url).not.toContain('?')
    expect(url.endsWith('/api/message')).toBe(true)
  })

  it('still throws on a non-2xx response when a name was supplied', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({}),
      }),
    )

    await expect(fetchMessage('a'.repeat(51))).rejects.toThrow(/400/)
  })
})
