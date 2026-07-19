/**
 * Parse collection ID from a full osu!Collector URL or raw ID string.
 * e.g. "https://osucollector.com/collections/44/speed-practice" → 44
 */
export function parseCollectionId(input) {
  if (!input) return null
  const trimmed = input.trim()
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed)
  const match = trimmed.match(/osucollector\.com\/collections\/(\d+)/)
  if (match) return parseInt(match[1])
  return null
}

/**
 * Fetch full collection data via Electron IPC (bypasses CORS).
 * Falls back to direct fetch in non-Electron environments.
 */
export async function fetchCollection(collectionId) {
  if (window.electronAPI?.fetchCollection) {
    const result = await window.electronAPI.fetchCollection(collectionId)
    if (!result.success) throw new Error(result.error || 'Failed to fetch collection')
    return result.data
  }
  // Fallback (browser dev mode)
  const res = await fetch(`https://osucollector.com/api/collections/${collectionId}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
