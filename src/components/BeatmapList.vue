<template>
  <div class="beatmap-list card">
    <!-- Table header -->
    <div class="list-header">
      <span class="col-num">#</span>
      <span class="col-cover"></span>
      <span class="col-title">Title / Artist</span>
      <span class="col-mapper">Mapper</span>
      <span class="col-diffs">Diffs</span>
      <span class="col-stars">★ Range</span>
      <span class="col-status">Status</span>
    </div>

    <!-- Rows -->
    <div class="list-body">
      <BeatmapRow
        v-for="(beatmap, index) in beatmaps"
        :key="beatmap.id"
        :beatmap="beatmap"
        :index="index + 1"
        :loading-meta="loadingMeta"
      />
    </div>

    <!-- Empty -->
    <div v-if="beatmaps.length === 0" class="list-empty">
      <div class="spinner"></div>
      <span class="text-muted text-sm">Loading beatmaps...</span>
    </div>
  </div>
</template>

<script>
import BeatmapRow from './BeatmapRow.vue'

export default {
  name: 'BeatmapList',
  components: { BeatmapRow },
  props: {
    beatmaps: { type: Array, default: () => [] },
    loadingMeta: { type: Boolean, default: false },
  },
}
</script>

<style scoped>
.beatmap-list {
  padding: 0;
  overflow: hidden;
}

.list-header {
  display: grid;
  grid-template-columns: 40px 48px 1fr 120px 60px 90px 120px;
  align-items: center;
  padding: 10px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  position: sticky;
  top: 0;
  z-index: 1;
}

.list-body {
  overflow-y: auto;
  max-height: calc(100vh - 380px);
}

.list-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
}
</style>
