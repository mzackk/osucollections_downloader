/**
 * Fetch rich beatmapset metadata from osu! API v2 via Electron IPC.
 */
export async function fetchBeatmapset(beatmapsetId, clientId, clientSecret) {
  if (window.electronAPI?.fetchBeatmapset) {
    const result = await window.electronAPI.fetchBeatmapset(beatmapsetId, clientId, clientSecret)
    if (!result.success) throw new Error(result.error || 'Failed to fetch beatmapset')
    return result.data
  }
  throw new Error('Electron API not available')
}

/**
 * Extract the min and max star ratings from a beatmapset's beatmaps array.
 */
export function getStarRange(beatmaps) {
  if (!beatmaps || beatmaps.length === 0) return { min: 0, max: 0 }
  const ratings = beatmaps.map(b => b.difficulty_rating || 0).filter(r => r > 0)
  if (ratings.length === 0) return { min: 0, max: 0 }
  return {
    min: Math.min(...ratings).toFixed(2),
    max: Math.max(...ratings).toFixed(2),
  }
}

/**
 * Clear the cached token in the main process.
 */
export function clearTokenCache() {
  window.electronAPI?.clearOsuToken?.()
}
