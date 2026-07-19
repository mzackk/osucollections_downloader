<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal card">
      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">⚙️ Settings</h2>
        <button class="btn btn-ghost btn-sm" @click="$emit('close')">✕ Close</button>
      </div>

      <div class="modal-body">
        <!-- osu! API v2 Credentials -->
        <section class="settings-section">
          <h3 class="section-title">osu! API v2 Credentials</h3>
          <p class="section-desc text-secondary text-sm">
            Required to fetch beatmap metadata (title, artist, star rating). Get your credentials at
            <a href="https://osu.ppy.sh/home/account/edit#oauth" target="_blank">osu.ppy.sh/home/account/edit</a>.
          </p>
          <div class="field">
            <label class="field-label">Client ID</label>
            <input v-model="form.osuClientId" class="input" placeholder="Your osu! OAuth Client ID" />
          </div>
          <div class="field">
            <label class="field-label">Client Secret</label>
            <div class="password-wrap">
              <input
                v-model="form.osuClientSecret"
                class="input"
                :type="showSecret ? 'text' : 'password'"
                placeholder="Your osu! OAuth Client Secret"
              />
              <button class="show-toggle" @click="showSecret = !showSecret" type="button">
                {{ showSecret ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>
        </section>

        <!-- osu! Songs Folder -->
        <section class="settings-section">
          <h3 class="section-title">osu! Songs Folder</h3>
          <p class="section-desc text-secondary text-sm">The folder where beatmap files will be downloaded and unpacked.</p>
          <div class="field">
            <div class="folder-row">
              <input v-model="form.songsFolder" class="input" placeholder="Path to osu! Songs folder" />
              <button class="btn btn-ghost btn-sm" @click="browseSongsFolder">📂 Browse</button>
              <button class="btn btn-ghost btn-sm" @click="autoDetect">🔍 Detect</button>
            </div>
            <p v-if="form.songsFolder" class="field-hint text-sm">
              <span :class="folderExists ? 'text-accent' : 'text-muted'">
                {{ folderExists ? '✅ Folder found' : '⚠️ Folder not found' }}
              </span>
            </p>
          </div>
        </section>

        <!-- Download Concurrency -->
        <section class="settings-section">
          <h3 class="section-title">Download Concurrency</h3>
          <p class="section-desc text-secondary text-sm">How many beatmaps to download simultaneously.</p>
          <div class="field">
            <div class="concurrency-row">
              <input
                v-model.number="form.concurrency"
                class="input concurrency-input"
                type="number"
                min="1"
                max="10"
              />
              <span class="text-secondary text-sm">concurrent download{{ form.concurrency !== 1 ? 's' : '' }}</span>
            </div>
          </div>
        </section>

        <!-- Mirror Order -->
        <section class="settings-section">
          <h3 class="section-title">Mirror Priority Order</h3>
          <p class="section-desc text-secondary text-sm">Drag to reorder. The app will try mirrors from top to bottom on failure.</p>
          <div class="mirrors-list">
            <div
              v-for="(mirror, i) in form.mirrors"
              :key="mirror"
              class="mirror-item"
              draggable="true"
              @dragstart="dragStart(i)"
              @dragover.prevent
              @drop="dragDrop(i)"
            >
              <span class="mirror-handle">⠿</span>
              <span class="mirror-num text-muted text-sm">{{ i + 1 }}</span>
              <span class="mirror-url text-sm truncate">{{ mirror }}</span>
              <span v-if="i === 0" class="badge badge-done" style="font-size:10px">Primary</span>
            </div>
          </div>
        </section>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="$emit('close')">Cancel</button>
        <button class="btn btn-primary" @click="save">💾 Save Settings</button>
      </div>
    </div>
  </div>
</template>

<script>
import { DEFAULT_MIRRORS } from '../services/downloader.js'

export default {
  name: 'SettingsModal',
  props: {
    initialSettings: { type: Object, default: () => ({}) },
  },
  emits: ['close', 'save'],
  data() {
    return {
      showSecret: false,
      folderExists: false,
      dragSrcIndex: null,
      form: {
        osuClientId: this.initialSettings.osuClientId || '',
        osuClientSecret: this.initialSettings.osuClientSecret || '',
        concurrency: this.initialSettings.concurrency || 1,
        mirrors: [...(this.initialSettings.mirrors || DEFAULT_MIRRORS)],
        songsFolder: this.initialSettings.songsFolder || '',
      },
    }
  },
  watch: {
    'form.songsFolder': {
      async handler(val) {
        if (val && window.electronAPI) {
          this.folderExists = await window.electronAPI.folderExists(val)
        } else {
          this.folderExists = false
        }
      },
      immediate: true,
    },
  },
  methods: {
    async browseSongsFolder() {
      if (!window.electronAPI) return
      const path = await window.electronAPI.browseFolder()
      if (path) this.form.songsFolder = path
    },
    async autoDetect() {
      if (!window.electronAPI) return
      const path = await window.electronAPI.detectOsuFolder()
      if (path) {
        this.form.songsFolder = path
      } else {
        alert('Could not auto-detect osu! Songs folder. Please select it manually.')
      }
    },
    dragStart(index) {
      this.dragSrcIndex = index
    },
    dragDrop(targetIndex) {
      if (this.dragSrcIndex === null || this.dragSrcIndex === targetIndex) return
      const mirrors = [...this.form.mirrors]
      const [item] = mirrors.splice(this.dragSrcIndex, 1)
      mirrors.splice(targetIndex, 0, item)
      this.form.mirrors = mirrors
      this.dragSrcIndex = null
    },
    save() {
      this.$emit('save', { ...this.form })
    },
  },
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal {
  width: 100%;
  max-width: 580px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  border-color: var(--border-focus);
  box-shadow: var(--shadow-glow), var(--shadow-card);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 18px;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.section-desc {
  margin-top: -4px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field-hint { margin-top: 4px; }

.password-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.password-wrap .input { padding-right: 44px; }
.show-toggle {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
}

.folder-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.concurrency-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.concurrency-input { width: 80px; }

.mirrors-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mirror-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  cursor: grab;
  transition: background 0.15s;
  user-select: none;
}
.mirror-item:hover { background: var(--bg-card-hover); border-color: var(--accent); }
.mirror-item:active { cursor: grabbing; }

.mirror-handle {
  color: var(--text-muted);
  font-size: 16px;
  flex-shrink: 0;
}
.mirror-num { flex-shrink: 0; width: 16px; text-align: center; }
.mirror-url { flex: 1; color: var(--text-secondary); }
</style>
