import { app, BrowserWindow, ipcMain, dialog, shell, session } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import os from 'os'
import https from 'https'
import http from 'http'
import { createWriteStream, existsSync, readdirSync } from 'fs'
import AdmZip from 'adm-zip'
import Store from 'electron-store'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const store = new Store()

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    show: false,
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })
}

app.whenReady().then(() => {
  // Strip Origin header from all outgoing requests to external APIs
  // (osucollector.com returns 500 when Origin header is present)
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://osucollector.com/*', 'https://osu.ppy.sh/*'] },
    (details, callback) => {
      const headers = { ...details.requestHeaders }
      delete headers['Origin']
      delete headers['origin']
      delete headers['Referer']
      delete headers['referer']
      callback({ requestHeaders: headers })
    }
  )

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── Helper: HTTP GET with redirect following ─────────────────────────────────

function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    let redirectCount = 0
    const MAX_REDIRECTS = 10

    function doRequest(currentUrl) {
      if (redirectCount > MAX_REDIRECTS) {
        reject(new Error('Too many redirects'))
        return
      }
      const protocol = currentUrl.startsWith('https') ? https : http
      const req = protocol.get(currentUrl, {
        headers: {
          'User-Agent': 'osu-collector-downloader/1.0',
          'Accept': 'application/json',
          ...options.headers,
        },
        timeout: options.timeout || 15000,
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          redirectCount++
          res.resume()
          doRequest(res.headers.location)
          return
        }
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`HTTP ${res.statusCode} from ${currentUrl}`))
          return
        }
        resolve(res)
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')) })
    }

    doRequest(url)
  })
}

function httpGetJSON(url, headers = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await httpGet(url, { headers })
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(new Error('Failed to parse JSON response')) }
      })
      res.on('error', reject)
    } catch (err) {
      reject(err)
    }
  })
}

// ─── IPC: osu!Collector API ───────────────────────────────────────────────────

ipcMain.handle('api:fetchCollection', async (_, collectionId) => {
  try {
    const data = await httpGetJSON(`https://osucollector.com/api/collections/${collectionId}`)
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ─── IPC: osu! API v2 ─────────────────────────────────────────────────────────

let osuToken = null
let osuTokenExpiry = 0

async function getOsuToken(clientId, clientSecret) {
  if (osuToken && Date.now() < osuTokenExpiry - 60000) return osuToken

  const postData = JSON.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
    scope: 'public',
  })

  const tokenData = await new Promise((resolve, reject) => {
    const options = {
      hostname: 'osu.ppy.sh',
      path: '/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'osu-collector-downloader/1.0',
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { reject(new Error('Failed to parse token response')) }
      })
    })
    req.on('error', reject)
    req.write(postData)
    req.end()
  })

  if (!tokenData.access_token) throw new Error('Failed to get osu! API token: ' + JSON.stringify(tokenData))
  osuToken = tokenData.access_token
  osuTokenExpiry = Date.now() + (tokenData.expires_in * 1000)
  return osuToken
}

ipcMain.handle('api:fetchBeatmapset', async (_, beatmapsetId, clientId, clientSecret) => {
  try {
    const token = await getOsuToken(clientId, clientSecret)
    const data = await httpGetJSON(
      `https://osu.ppy.sh/api/v2/beatmapsets/${beatmapsetId}`,
      { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    )
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('api:clearOsuToken', () => {
  osuToken = null
  osuTokenExpiry = 0
})

// ─── IPC: Settings ────────────────────────────────────────────────────────────

ipcMain.handle('settings:get', (_, key) => store.get(key))
ipcMain.handle('settings:set', (_, key, value) => store.set(key, value))
ipcMain.handle('settings:getAll', () => store.store)

// ─── IPC: Folder Detection ────────────────────────────────────────────────────

ipcMain.handle('folder:detectOsu', () => {
  let candidates = []
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
    candidates = [
      path.join(localAppData, 'osu!', 'Songs'),
      path.join(os.homedir(), 'AppData', 'Local', 'osu!', 'Songs'),
    ]
  } else if (process.platform === 'darwin') {
    candidates = [path.join(os.homedir(), 'Library', 'Application Support', 'osu', 'Songs')]
  } else {
    candidates = [path.join(os.homedir(), '.local', 'share', 'osu', 'Songs')]
  }
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return null
})

ipcMain.handle('folder:browse', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select osu! Songs Folder',
  })
  if (!result.canceled && result.filePaths.length > 0) return result.filePaths[0]
  return null
})

ipcMain.handle('folder:exists', (_, folderPath) => fs.existsSync(folderPath))

// ─── IPC: Duplicate Detection ─────────────────────────────────────────────────

ipcMain.handle('beatmap:checkExists', (_, songsFolder, beatmapsetId) => {
  if (!songsFolder || !fs.existsSync(songsFolder)) return false
  try {
    const entries = readdirSync(songsFolder)
    return entries.some(e => e.startsWith(String(beatmapsetId) + ' ') || e.startsWith(String(beatmapsetId) + '-'))
  } catch { return false }
})

// ─── IPC: Download ────────────────────────────────────────────────────────────

ipcMain.handle('beatmap:download', async (event, { beatmapsetId, mirrors, songsFolder }) => {
  const tmpFile = path.join(os.tmpdir(), `osu_${beatmapsetId}.osz`)
  let lastError = null

  for (const mirrorTemplate of mirrors) {
    const url = mirrorTemplate.replace('{id}', beatmapsetId)
    try {
      const response = await httpGet(url)
      const totalBytes = parseInt(response.headers['content-length'] || '0', 10)
      let downloadedBytes = 0

      await new Promise((resolve, reject) => {
        const writeStream = createWriteStream(tmpFile)
        response.on('data', (chunk) => {
          downloadedBytes += chunk.length
          if (totalBytes > 0) {
            const progress = Math.round((downloadedBytes / totalBytes) * 100)
            event.sender.send(`download:progress:${beatmapsetId}`, progress)
          }
        })
        response.pipe(writeStream)
        writeStream.on('finish', resolve)
        writeStream.on('error', reject)
        response.on('error', reject)
      })

      // Unpack into Songs folder
      try {
        const zip = new AdmZip(tmpFile)
        const extractDir = path.join(songsFolder, String(beatmapsetId))
        zip.extractAllTo(extractDir, true)
      } catch {
        const destFile = path.join(songsFolder, `${beatmapsetId}.osz`)
        fs.renameSync(tmpFile, destFile)
      }
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)

      return { success: true, mirror: url }
    } catch (err) {
      lastError = err.message
      if (fs.existsSync(tmpFile)) try { fs.unlinkSync(tmpFile) } catch {}
    }
  }

  return { success: false, error: lastError }
})

ipcMain.handle('app:openFolder', (_, folderPath) => shell.openPath(folderPath))
