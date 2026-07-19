const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // osu!Collector API (via main process - bypasses CORS)
  fetchCollection: (collectionId) => ipcRenderer.invoke('api:fetchCollection', collectionId),

  // osu! API v2 (via main process)
  fetchBeatmapset: (beatmapsetId, clientId, clientSecret) =>
    ipcRenderer.invoke('api:fetchBeatmapset', beatmapsetId, clientId, clientSecret),
  clearOsuToken: () => ipcRenderer.invoke('api:clearOsuToken'),

  // Settings
  settingsGet: (key) => ipcRenderer.invoke('settings:get', key),
  settingsSet: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  settingsGetAll: () => ipcRenderer.invoke('settings:getAll'),

  // Folder
  detectOsuFolder: () => ipcRenderer.invoke('folder:detectOsu'),
  browseFolder: () => ipcRenderer.invoke('folder:browse'),
  folderExists: (p) => ipcRenderer.invoke('folder:exists', p),

  // Beatmap
  checkBeatmapExists: (songsFolder, beatmapsetId) =>
    ipcRenderer.invoke('beatmap:checkExists', songsFolder, beatmapsetId),
  downloadBeatmap: (opts) => ipcRenderer.invoke('beatmap:download', opts),

  onDownloadProgress: (beatmapsetId, callback) => {
    const channel = `download:progress:${beatmapsetId}`
    const listener = (_, progress) => callback(progress)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },

  openFolder: (folderPath) => ipcRenderer.invoke('app:openFolder', folderPath),
})
