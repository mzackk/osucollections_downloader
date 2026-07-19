<template>
  <div class="beatmap-row" :class="'row-' + beatmap.status">
    <!-- # -->
    <span class="col-num text-muted text-sm">{{ index }}</span>

    <!-- Cover art -->
    <div class="col-cover">
      <div class="cover-wrap">
        <img
          v-if="beatmap.coverUrl"
          :src="beatmap.coverUrl"
          :alt="beatmap.title"
          class="cover-img"
          loading="lazy"
        />
        <div v-else class="cover-placeholder">🎵</div>
        <!-- Per-row download progress overlay -->
        <div
          v-if="beatmap.status === 'downloading'"
          class="cover-progress"
          :style="{ width: beatmap.progress + '%' }"
        ></div>
      </div>
    </div>

    <!-- Title + Artist -->
    <div class="col-title">
      <span v-if="isLoadingMeta" class="skeleton" style="width:60%;height:14px;display:block;margin-bottom:6px"></span>
      <span v-else class="beatmap-title truncate" :title="beatmap.title">{{ beatmap.title }}</span>

      <span v-if="isLoadingMeta" class="skeleton" style="width:40%;height:11px;display:block"></span>
      <span v-else class="beatmap-artist text-sm text-secondary truncate" :title="beatmap.artist">{{ beatmap.artist }}</span>
    </div>

    <!-- Mapper -->
    <div class="col-mapper">
      <span v-if="isLoadingMeta" class="skeleton" style="width:80%;height:12px;display:block"></span>
      <span v-else class="text-sm text-secondary truncate" :title="beatmap.creator">{{ beatmap.creator || '—' }}</span>
    </div>

    <!-- Diff count -->
    <div class="col-diffs">
      <span class="badge badge-queued">{{ beatmap.diffCount }}</span>
    </div>

    <!-- Star range -->
    <div class="col-stars">
      <span v-if="beatmap.starMin || beatmap.starMax" class="star-range text-sm">
        ⭐ {{ beatmap.starMin }}–{{ beatmap.starMax }}
      </span>
      <span v-else-if="isLoadingMeta" class="skeleton" style="width:60px;height:12px;display:block"></span>
      <span v-else class="text-muted text-sm">—</span>
    </div>

    <!-- Status -->
    <div class="col-status">
      <span v-if="beatmap.status === 'done'" class="badge badge-done">✅ Done</span>
      <span v-else-if="beatmap.status === 'skipped'" class="badge badge-skipped">⏭ Skipped</span>
      <span v-else-if="beatmap.status === 'failed'" class="badge badge-failed" :title="beatmap.error">❌ Failed</span>
      <span v-else-if="beatmap.status === 'checking'" class="badge badge-checking">🔍 Checking</span>
      <span v-else-if="beatmap.status === 'downloading'" class="badge badge-downloading">
        ⬇️ {{ beatmap.progress }}%
      </span>
      <span v-else class="badge badge-queued">⏳ Queue</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BeatmapRow',
  props: {
    beatmap: { type: Object, required: true },
    index: { type: Number, required: true },
    loadingMeta: { type: Boolean, default: false },
  },
  computed: {
    isLoadingMeta() {
      return this.loadingMeta && this.beatmap.title === 'Loading...'
    },
  },
}
</script>

<style scoped>
.beatmap-row {
  display: grid;
  grid-template-columns: 40px 48px 1fr 120px 60px 90px 120px;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s ease;
  min-height: 58px;
}

.beatmap-row:hover {
  background: var(--bg-card-hover);
}

.beatmap-row.row-done { border-left: 2px solid var(--status-done); }
.beatmap-row.row-failed { border-left: 2px solid var(--status-fail); }
.beatmap-row.row-skipped { border-left: 2px solid var(--status-skip); }
.beatmap-row.row-downloading { border-left: 2px solid var(--status-downloading); }

/* Cover */
.cover-wrap {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--text-muted);
}

.cover-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: var(--accent);
  transition: width 0.3s ease;
}

/* Title / Artist */
.col-title {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding-right: 12px;
}

.beatmap-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.beatmap-artist {
  display: block;
}

/* Columns */
.col-num { text-align: center; }
.col-cover { padding: 0; }
.col-diffs { text-align: center; }
.col-stars .star-range { color: var(--status-skip); }
.col-mapper, .col-status { min-width: 0; }
</style>
