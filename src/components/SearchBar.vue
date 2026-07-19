<template>
  <div class="search-bar card">
    <div class="search-row">
      <div class="search-input-wrap">
        <span class="search-icon">🔗</span>
        <input
          v-model="url"
          class="input search-input"
          placeholder="Paste osu!Collector URL here... (e.g. https://osucollector.com/collections/44/...)"
          @keydown.enter="submit"
          @paste="onPaste"
          :disabled="loading"
        />
        <button v-if="url" class="clear-btn" @click="url = ''" title="Clear">✕</button>
      </div>
      <button
        class="btn btn-primary"
        @click="submit"
        :disabled="!url.trim() || loading"
      >
        <span v-if="loading" class="spinner" style="width:14px;height:14px"></span>
        <span v-else>🔍</span>
        {{ loading ? 'Loading...' : 'Search' }}
      </button>
    </div>
    <p v-if="error" class="search-error">⚠️ {{ error }}</p>
  </div>
</template>

<script>
export default {
  name: 'SearchBar',
  props: {
    loading: { type: Boolean, default: false },
  },
  emits: ['search'],
  data() {
    return {
      url: '',
      error: '',
    }
  },
  methods: {
    submit() {
      this.error = ''
      const trimmed = this.url.trim()
      if (!trimmed) return

      const isValidUrl = trimmed.includes('osucollector.com/collections/') || /^\d+$/.test(trimmed)
      if (!isValidUrl) {
        this.error = 'Please paste a valid osu!Collector URL or collection ID'
        return
      }

      this.$emit('search', trimmed)
    },
    onPaste(e) {
      // Auto-submit on paste if the pasted content looks like a valid URL
      this.$nextTick(() => {
        const pasted = this.url.trim()
        if (pasted.includes('osucollector.com/collections/')) {
          this.submit()
        }
      })
    },
  },
}
</script>

<style scoped>
.search-bar {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  font-size: 14px;
  pointer-events: none;
  z-index: 1;
}

.search-input {
  padding-left: 36px;
  padding-right: 36px;
}

.clear-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.2s;
  z-index: 1;
}
.clear-btn:hover { color: var(--text-primary); }

.search-error {
  font-size: 12px;
  color: var(--status-fail);
}
</style>
