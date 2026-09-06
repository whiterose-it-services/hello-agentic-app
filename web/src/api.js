const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

/**
 * Fetches the greeting message from the API.
 * Throws if the network call fails or the response is not a 2xx status,
 * so callers have a single place to catch errors.
 *
 * This is the only place that knows the request URL: when `name` has
 * non-whitespace content it is appended as an encoded `name` query parameter,
 * otherwise the bare `/api/message` is requested so the API returns its
 * unpersonalized greeting.
 * @param {string} [name] optional text to personalize the greeting with
 * @returns {Promise<{ message: string, timestampUtc: string }>}
 */
export async function fetchMessage(name) {
  let url = `${API_BASE_URL}/api/message`

  if (typeof name === 'string' && name.trim() !== '') {
    const params = new URLSearchParams({ name })
    url = `${url}?${params.toString()}`
  }

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch message: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
