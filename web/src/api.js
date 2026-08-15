const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

/**
 * Fetches the greeting message from the API.
 * Throws if the network call fails or the response is not a 2xx status,
 * so callers have a single place to catch errors.
 * @returns {Promise<{ message: string }>}
 */
export async function fetchMessage() {
  const response = await fetch(`${API_BASE_URL}/api/message`)

  if (!response.ok) {
    throw new Error(`Failed to fetch message: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
