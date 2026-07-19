# osu! Collection Downloader 🎵

A premium, high-performance desktop application for Windows and macOS designed to download entire beatmap collections from [osu!Collector](https://osucollector.com) directly into your game client.

Built with **Electron**, **Vue 3 (Composition API)**, and **Vite**.

---

## ✨ Features

- **🔗 Smart URL Parsing:** Paste a full osu!Collector collection URL or just the ID, and the application instantly parses it and retrieves the collection.
- **⚡ Rich Metadata Lookup:** Integrates with the official **osu! API v2** to display beautiful song details (Title, Artist, Mapper, Difficulty count, and Star Rating range) rather than just raw beatmap IDs.
- **📥 Parallel Download Queue:** A fully customizable download manager. Configure concurrency in settings to download multiple files at once.
- **🔄 Auto-Mirror Fallback:** Automatically switches through multiple download mirrors (Nerinyan, catboy.best, osu!direct) if one mirror fails or rate-limits you.
- **📂 osu! Folder Auto-Detection:** Automatically locates your game directory on launch:
  - **Windows:** `%LOCALAPPDATA%\osu!\Songs`
  - **macOS:** `~/Library/Application Support/osu/Songs`
- **📦 Auto-Unpack:** Downloads are unpacked directly into your osu! Songs directory immediately, so the maps are ready to play.
- **⏭️ Smart Skip (Duplicate Detection):** Automatically scans your Songs folder and skips downloading maps you already own.
- **🌗 Theme Toggle:** A polished dark and light mode toggle inspired by the osu! client design palette.

---

## 🛠️ Tech Stack

- **Shell:** Electron (Main process manages Node.js file system APIs, unzipping, and HTTP streaming)
- **Frontend UI:** Vue 3 (Composition API)
- **Styles:** Custom CSS variables for clean theme transitions and glassmorphism styling
- **Bundler:** Vite
- **Builder:** `electron-builder` (packages into a standalone Windows `.exe` or macOS `.dmg`)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (v18 or higher recommended)
- [npm](https://www.npmjs.com)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/osu-collection-downloader.git
   cd osu-collection-downloader
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start Development Server:**
   This starts the Vite dev server and launches the Electron application with Hot Module Replacement (HMR) enabled:
   ```bash
   npm run dev
   ```

### ⚙️ Setting Up osu! API Metadata (Optional but Recommended)

To show rich metadata (covers, title, artist, star ratings) instead of generic loading placeholders:
1. Go to your [osu! Account settings page](https://osu.ppy.sh/home/account/edit#oauth).
2. Scroll to the bottom and create a new **OAuth Application**.
3. Copy your **Client ID** and **Client Secret**.
4. In the downloader app, open the **Settings** menu (gear icon ⚙️) and paste them in.

---

## 🏗️ Project Structure

```
osu_downloader/
├── electron/
│   ├── main.js          # Electron main process (Node.js backend, IPC handlers)
│   └── preload.js       # Preload script (safe bridge exposing secure APIs)
├── src/
│   ├── App.vue          # Root Vue component
│   ├── main.js          # Vue entry point
│   ├── style.css        # Global CSS stylesheet & theme tokens
│   ├── components/      # Vue Components (SearchBar, SettingsModal, etc.)
│   └── services/        # API and Queue wrappers (Downloader queue, osu! API client)
├── index.html
├── vite.config.js
└── package.json
```

---

## 📦 Building Standalone Executables

To build a production-ready installer/executable (`.exe` for Windows or `.dmg` for macOS):

```bash
npm run dist
```

The resulting packages will be generated inside the `release/` directory.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
