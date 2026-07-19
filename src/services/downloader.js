/**
 * Download queue manager with mirror fallback and concurrency control.
 * Works with Electron's IPC bridge (window.electronAPI).
 */

export const DEFAULT_MIRRORS = [
  'https://api.nerinyan.moe/d/{id}',
  'https://catboy.best/d/{id}',
  'https://osu.direct/api/d/{id}',
]

export const STATUS = {
  QUEUED: 'queued',
  CHECKING: 'checking',
  SKIPPED: 'skipped',
  DOWNLOADING: 'downloading',
  DONE: 'done',
  FAILED: 'failed',
}

/**
 * Create a download queue runner.
 * @param {Object} opts
 * @param {Array}  opts.items         - Array of { beatmapsetId, ... }
 * @param {string} opts.songsFolder   - Absolute path to osu! Songs folder
 * @param {Array}  opts.mirrors       - Mirror URL templates
 * @param {number} opts.concurrency   - Max simultaneous downloads
 * @param {Function} opts.onUpdate    - Called with (beatmapsetId, patch) on status change
 * @param {Function} opts.onProgress  - Called with (beatmapsetId, percent)
 */
export function createDownloadQueue({
  items,
  songsFolder,
  mirrors = DEFAULT_MIRRORS,
  concurrency = 1,
  onUpdate,
  onProgress,
}) {
  let paused = false
  let cancelled = false
  let running = 0
  let queue = [...items]
  const results = {}

  function update(beatmapsetId, patch) {
    Object.assign(results[beatmapsetId] || {}, patch)
    onUpdate?.(beatmapsetId, patch)
  }

  async function processItem(item) {
    const id = item.beatmapsetId
    results[id] = { beatmapsetId: id, status: STATUS.CHECKING, progress: 0 }
    update(id, { status: STATUS.CHECKING })

    // Duplicate check
    const exists = await window.electronAPI.checkBeatmapExists(songsFolder, id)
    if (exists) {
      update(id, { status: STATUS.SKIPPED, progress: 100 })
      return
    }

    update(id, { status: STATUS.DOWNLOADING, progress: 0 })

    // Listen for progress events
    const removeListener = window.electronAPI.onDownloadProgress(id, (progress) => {
      update(id, { progress })
      onProgress?.(id, progress)
    })

    const result = await window.electronAPI.downloadBeatmap({
      beatmapsetId: id,
      mirrors: [...mirrors],
      songsFolder,
    })

    removeListener?.()

    if (result.success) {
      update(id, { status: STATUS.DONE, progress: 100 })
    } else {
      update(id, { status: STATUS.FAILED, progress: 0, error: result.error })
    }
  }

  async function runNext() {
    if (cancelled) return
    if (paused) return
    if (queue.length === 0) return
    if (running >= concurrency) return

    const item = queue.shift()
    if (!item) return

    running++
    try {
      await processItem(item)
    } finally {
      running--
      // Small delay between downloads to respect rate limits
      await new Promise(r => setTimeout(r, 500))
      runNext()
    }
  }

  function start() {
    const slots = Math.min(concurrency, queue.length)
    for (let i = 0; i < slots; i++) {
      runNext()
    }
  }

  function pause() { paused = true }
  function resume() {
    paused = false
    const slots = Math.min(concurrency - running, queue.length)
    for (let i = 0; i < slots; i++) runNext()
  }
  function cancel() {
    cancelled = true
    queue = []
  }

  return { start, pause, resume, cancel, results }
}
