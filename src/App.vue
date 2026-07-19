<template>
  <div class="app-shell" :data-theme="theme">
    <!-- Navbar -->
    <header class="navbar">
      <div class="navbar-brand">
        <span class="brand-icon">🎵</span>
        <span class="brand-title">osu! <span class="text-accent">Collector</span></span>
      </div>
      <div class="navbar-actions">
        <button class="btn btn-ghost btn-sm" @click="toggleTheme" :title="theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'">
          {{ theme === 'dark' ? '☀️' : '🌙' }}
        </button>
        <button class="btn btn-ghost btn-sm" @click="showSettings = true" title="Settings">
          ⚙️ Settings
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Search Bar -->
      <SearchBar @search="handleSearch" :loading="loadingCollection" />

      <!-- No folder warning -->
      <div v-if="!songsFolder" class="folder-warning card">
        <div class="warning-icon">⚠️</div>
        <div>
          <strong>osu! Songs folder not detected</strong>
          <p class="text-secondary text-sm">Please configure the Songs folder path in Settings before downloading.</p>
        </div>
        <button class="btn btn-ghost btn-sm" @click="showSettings = true">Configure</button>
      </div>
      <!-- Error banner -->
      <transition name="fade">
        <div v-if="collectionError" class="error-banner card">
          <span class="error-icon">❌</span>
          <div>
            <strong>Failed to load collection</strong>
            <p class="text-sm text-secondary">{{ collectionError }}</p>
          </div>
          <button class="btn btn-ghost btn-sm" @click="collectionError = null">Dismiss</button>
        </div>
      </transition>

      <!-- Loading indicator -->
      <transition name="fade">
        <div v-if="loadingCollection" class="loading-banner">
          <div class="spinner"></div>
          <span class="text-secondary text-sm">Fetching collection...</span>
        </div>
      </transition>


      <transition name="slide-up">
        <div v-if="collection" class="collection-area">
          <CollectionHeader
            :collection="collection"
            :beatmaps="beatmaps"
            :downloading="downloading"
            :paused="paused"
            @download-all="startDownloadAll"
            @pause="pauseDownload"
            @resume="resumeDownload"
            @cancel="cancelDownload"
          />
          <BeatmapList :beatmaps="beatmaps" :loading-meta="loadingMeta" />
        </div>
      </transition>

      <!-- Empty State -->
      <transition name="fade">
        <div v-if="!collection && !loadingCollection" class="empty-state">
          <div class="empty-icon">🎮</div>
          <h2>Ready to download</h2>
          <p class="text-secondary">Paste an osu!Collector collection URL above to get started</p>
          <p class="text-muted text-sm">e.g. https://osucollector.com/collections/44/speed-practice</p>
        </div>
      </transition>
    </main>

    <!-- Settings Modal -->
    <SettingsModal
      v-if="showSettings"
      :initial-settings="settings"
      @close="showSettings = false"
      @save="handleSettingsSave"
    />
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, provide } from 'vue'
import SearchBar from './components/SearchBar.vue'
import CollectionHeader from './components/CollectionHeader.vue'
import BeatmapList from './components/BeatmapList.vue'
import SettingsModal from './components/SettingsModal.vue'
import { parseCollectionId, fetchCollection } from './services/osuCollector.js'
import { fetchBeatmapset, getStarRange, clearTokenCache } from './services/osuApi.js'
import { createDownloadQueue, DEFAULT_MIRRORS, STATUS } from './services/downloader.js'

export default {
  name: 'App',
  components: { SearchBar, CollectionHeader, BeatmapList, SettingsModal },
  setup() {
    // ── Theme ──────────────────────────────────────────────────────────────────
    const theme = ref('dark')

    function toggleTheme() {
      theme.value = theme.value === 'dark' ? 'light' : 'dark'
      window.electronAPI?.settingsSet('theme', theme.value)
    }

    // ── Settings ───────────────────────────────────────────────────────────────
    const settings = reactive({
      osuClientId: '',
      osuClientSecret: '',
      concurrency: 1,
      mirrors: [...DEFAULT_MIRRORS],
      songsFolder: '',
    })
    const songsFolder = computed(() => settings.songsFolder)
    const showSettings = ref(false)

    async function loadSettings() {
      if (!window.electronAPI) return
      const all = await window.electronAPI.settingsGetAll()
      if (all.theme) theme.value = all.theme
      if (all.osuClientId) settings.osuClientId = all.osuClientId
      if (all.osuClientSecret) settings.osuClientSecret = all.osuClientSecret
      if (all.concurrency) settings.concurrency = Number(all.concurrency)
      if (all.mirrors) settings.mirrors = all.mirrors
      if (all.songsFolder) {
        settings.songsFolder = all.songsFolder
      } else {
        // Auto-detect
        const detected = await window.electronAPI.detectOsuFolder()
        if (detected) {
          settings.songsFolder = detected
          window.electronAPI.settingsSet('songsFolder', detected)
        }
      }
    }

    async function handleSettingsSave(newSettings) {
      Object.assign(settings, newSettings)
      clearTokenCache()
      if (window.electronAPI) {
        await window.electronAPI.settingsSet('osuClientId', settings.osuClientId)
        await window.electronAPI.settingsSet('osuClientSecret', settings.osuClientSecret)
        await window.electronAPI.settingsSet('concurrency', Number(settings.concurrency))
        // Spread into plain array — Vue Proxy objects cannot pass Electron's structured clone
        await window.electronAPI.settingsSet('mirrors', [...settings.mirrors])
        await window.electronAPI.settingsSet('songsFolder', settings.songsFolder)
      }
      showSettings.value = false
    }

    // ── Collection ─────────────────────────────────────────────────────────────
    const collection = ref(null)
    const beatmaps = ref([])
    const loadingCollection = ref(false)
    const loadingMeta = ref(false)
    const collectionError = ref(null)

    async function handleSearch(url) {
      const id = parseCollectionId(url)
      if (!id) {
        collectionError.value = 'Invalid URL or ID'
        return
      }

      loadingCollection.value = true
      collectionError.value = null
      collection.value = null
      beatmaps.value = []

      try {
        const data = await fetchCollection(id)
        collection.value = data

        // Build initial beatmap list with placeholders
        beatmaps.value = data.beatmapsets.map(bs => ({
          id: bs.id,
          beatmapsetId: bs.id,
          title: 'Loading...',
          artist: '',
          creator: '',
          coverUrl: '',
          diffCount: bs.beatmaps?.length ?? 0,
          starMin: 0,
          starMax: 0,
          status: STATUS.QUEUED,
          progress: 0,
        }))

        loadingCollection.value = false

        // Fetch rich metadata if credentials are set
        if (settings.osuClientId && settings.osuClientSecret) {
          await fetchMetadataBatch(data.beatmapsets)
        }
      } catch (err) {
        loadingCollection.value = false
        collectionError.value = err.message
      }
    }

    async function fetchMetadataBatch(beatmapsets) {
      loadingMeta.value = true
      const BATCH = 5

      for (let i = 0; i < beatmapsets.length; i += BATCH) {
        const batch = beatmapsets.slice(i, i + BATCH)
        await Promise.all(batch.map(async (bs) => {
          try {
            const meta = await fetchBeatmapset(bs.id, settings.osuClientId, settings.osuClientSecret)
            const starRange = getStarRange(meta.beatmaps || [])
            const idx = beatmaps.value.findIndex(b => b.id === bs.id)
            if (idx !== -1) {
              beatmaps.value[idx] = {
                ...beatmaps.value[idx],
                title: meta.title,
                artist: meta.artist,
                creator: meta.creator,
                coverUrl: meta.covers?.card || meta.covers?.list || '',
                diffCount: (meta.beatmaps || []).length,
                starMin: starRange.min,
                starMax: starRange.max,
              }
            }
          } catch {
            // Keep placeholder if metadata fetch fails
          }
        }))
      }

      loadingMeta.value = false
    }

    // ── Download Manager ───────────────────────────────────────────────────────
    const downloading = ref(false)
    const paused = ref(false)
    let queue = null

    function startDownloadAll() {
      if (!songsFolder.value) {
        showSettings.value = true
        return
      }

      downloading.value = true
      paused.value = false

      // Reset statuses
      beatmaps.value = beatmaps.value.map(b => ({ ...b, status: STATUS.QUEUED, progress: 0 }))

      queue = createDownloadQueue({
        items: beatmaps.value.map(b => ({ beatmapsetId: b.id })),
        songsFolder: songsFolder.value,
        mirrors: [...settings.mirrors],
        concurrency: settings.concurrency,
        onUpdate(beatmapsetId, patch) {
          const idx = beatmaps.value.findIndex(b => b.id === beatmapsetId)
          if (idx !== -1) {
            beatmaps.value[idx] = { ...beatmaps.value[idx], ...patch }
          }
          // Check if all done
          const allDone = beatmaps.value.every(
            b => [STATUS.DONE, STATUS.FAILED, STATUS.SKIPPED].includes(b.status)
          )
          if (allDone) {
            downloading.value = false
            queue = null
          }
        },
        onProgress(beatmapsetId, progress) {
          const idx = beatmaps.value.findIndex(b => b.id === beatmapsetId)
          if (idx !== -1) {
            beatmaps.value[idx] = { ...beatmaps.value[idx], progress }
          }
        },
      })

      queue.start()
    }

    function pauseDownload() {
      queue?.pause()
      paused.value = true
    }

    function resumeDownload() {
      queue?.resume()
      paused.value = false
    }

    function cancelDownload() {
      queue?.cancel()
      queue = null
      downloading.value = false
      paused.value = false
      beatmaps.value = beatmaps.value.map(b =>
        [STATUS.QUEUED, STATUS.DOWNLOADING, STATUS.CHECKING].includes(b.status)
          ? { ...b, status: STATUS.QUEUED, progress: 0 }
          : b
      )
    }

    onMounted(() => {
      loadSettings()
    })

    // Provide theme to children
    provide('theme', theme)

    return {
      theme, toggleTheme,
      settings, songsFolder, showSettings, handleSettingsSave,
      collection, beatmaps, loadingCollection, loadingMeta, collectionError,
      handleSearch,
      downloading, paused,
      startDownloadAll, pauseDownload, resumeDownload, cancelDownload,
    }
  },
}
</script>

<style>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
  transition: background 0.3s ease, color 0.3s ease;
}

/* ─── Navbar ─────────────────────────────────────────────────────────────────── */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}

.navbar::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity: 0.4;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon { font-size: 20px; }

.brand-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ─── Main Content ──────────────────────────────────────────────────────────── */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ─── Folder Warning ────────────────────────────────────────────────────────── */
.folder-warning {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(240, 180, 41, 0.08);
  border-color: rgba(240, 180, 41, 0.3);
  padding: 14px 20px;
}

.warning-icon { font-size: 20px; flex-shrink: 0; }

/* ─── Collection Area ──────────────────────────────────────────────────────── */
.collection-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ─── Empty State ────────────────────────────────────────────────────────────── */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 8px;
  filter: drop-shadow(0 4px 16px var(--accent-glow));
}

.empty-state h2 {
  font-size: 22px;
  color: var(--text-primary);
}

/* ─── Error Banner ───────────────────────────────────────────────────────────── */
.error-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 92, 92, 0.08);
  border-color: rgba(255, 92, 92, 0.35);
  padding: 14px 20px;
}
.error-icon { font-size: 20px; flex-shrink: 0; }

/* ─── Loading Banner ─────────────────────────────────────────────────────────── */
.loading-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
</style>
