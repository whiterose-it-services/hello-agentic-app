import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchMessage } from './api'

afterEach(() => {
  vi.restoreAllMocks()
})

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
})
