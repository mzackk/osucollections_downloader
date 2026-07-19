<template>
  <div class="collection-header card">
    <!-- Top row: collection name + stats -->
    <div class="header-top">
      <div class="collection-info">
        <h2 class="collection-title">{{ collection.name }}</h2>
        <div class="collection-meta">
          <span class="text-secondary text-sm">by <strong>{{ collection.uploader?.username || 'Unknown' }}</strong></span>
          <span class="meta-sep text-muted">·</span>
          <span class="text-secondary text-sm">{{ collection.beatmapCount }} beatmaps</span>
          <span class="meta-sep text-muted">·</span>
          <span class="text-secondary text-sm">{{ doneCount }} downloaded · {{ skippedCount }} skipped · {{ failedCount }} failed</span>
        </div>
      </div>
    </div>

    <!-- Overall progress bar -->
    <div class="overall-progress">
      <div class="progress-labels">
        <span class="text-sm text-secondary">Overall Progress</span>
        <span class="text-sm font-bold text-accent">{{ doneCount + skippedCount }} / {{ beatmaps.length }}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: overallPercent + '%' }"></div>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="header-actions">
      <button
        v-if="!downloading"
        class="btn btn-primary"
        @click="$emit('download-all')"
        :disabled="beatmaps.length === 0"
      >
        ⬇️ Download All
      </button>

      <template v-if="downloading">
        <button v-if="!paused" class="btn btn-ghost" @click="$emit('pause')">
          ⏸️ Pause
        </button>
        <button v-else class="btn btn-primary" @click="$emit('resume')">
          ▶️ Resume
        </button>
        <button class="btn btn-danger" @click="$emit('cancel')">
          ✕ Cancel
        </button>
      </template>

      <span v-if="downloading && !paused" class="downloading-badge">
        <span class="spinner"></span>
        Downloading...
      </span>
      <span v-if="paused" class="paused-badge">⏸ Paused</span>
    </div>
  </div>
</template>

<script>
import { STATUS } from '../services/downloader.js'

export default {
  name: 'CollectionHeader',
  props: {
    collection: { type: Object, required: true },
    beatmaps: { type: Array, default: () => [] },
    downloading: { type: Boolean, default: false },
    paused: { type: Boolean, default: false },
  },
  emits: ['download-all', 'pause', 'resume', 'cancel'],
  computed: {
    doneCount() {
      return this.beatmaps.filter(b => b.status === STATUS.DONE).length
    },
    skippedCount() {
      return this.beatmaps.filter(b => b.status === STATUS.SKIPPED).length
    },
    failedCount() {
      return this.beatmaps.filter(b => b.status === STATUS.FAILED).length
    },
    overallPercent() {
      if (!this.beatmaps.length) return 0
      return Math.round(((this.doneCount + this.skippedCount) / this.beatmaps.length) * 100)
    },
  },
}
</script>

<style scoped>
.collection-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.collection-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.collection-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-sep { opacity: 0.4; }

.overall-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.downloading-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--status-downloading);
  font-weight: 600;
}

.paused-badge {
  font-size: 13px;
  color: var(--status-skip);
  font-weight: 600;
}
</style>
