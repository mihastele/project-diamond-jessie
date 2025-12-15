# Diamond

> Open-source API client — a modern alternative to Postman

Diamond is a lightweight, fast, and privacy-focused API client built with **Tauri 2** and **Vue 3**. It's designed for developers who want a native desktop experience without the bloat of Electron-based alternatives.

![Diamond Screenshot](docs/screenshot.png)

## Features

### Core Request Features
- **HTTP Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
- **Request Builder**: URL params, headers, cookies, query builder
- **Body Editors**: JSON (with validation), XML, text, form-data, x-www-form-urlencoded, file upload, binary
- **Response Viewer**: Syntax-highlighted body, pretty/raw/preview modes, headers, status, timing breakdown

### Authentication
- Bearer Token
- Basic Auth
- API Key (header or query)
- OAuth 2.0 with PKCE support

### Organization
- **Collections**: Nested folders and requests with metadata
- **Environments**: Named variable sets (dev/staging/prod) with easy switching
- **Variables**: `{{varName}}` templating in URL, headers, and body
- **Secrets**: Masked variables that are never logged

### Developer Experience
- **Keyboard-First**: Full keyboard navigation with command palette (Ctrl+Shift+P)
- **Tabbed Interface**: Multiple requests open simultaneously
- **History**: Per-workspace request history with quick replay
- **Theming**: Light/dark/system themes

### Local-First & Privacy
- All data stored locally as human-readable JSON
- No telemetry, no cloud sync required
- Git-friendly workspace format
- Import/Export for Postman collections

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 1.70+
- Platform-specific dependencies for Tauri:
  - **Windows**: Microsoft Visual Studio C++ Build Tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `webkit2gtk`, `libappindicator3-dev`, etc.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/diamond-api/diamond.git
cd diamond

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Quick Start (Web Preview)

To preview just the Vue frontend without Tauri:

```bash
npm install
npm run dev
```

Then open http://localhost:1420 in your browser.

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New Tab | `Ctrl+T` |
| Close Tab | `Ctrl+W` |
| Send Request | `Ctrl+Enter` |
| Command Palette | `Ctrl+Shift+P` |
| Toggle Sidebar | `Ctrl+B` |
| Focus URL Bar | `Ctrl+L` |
| Switch Environment | `Ctrl+E` |

## Project Structure

```
diamond/
├── src/                    # Vue 3 frontend
│   ├── components/         # UI components
│   ├── stores/             # Pinia state stores
│   ├── types/              # TypeScript types
│   └── styles/             # Tailwind CSS
├── src-tauri/              # Rust backend
│   └── src/
│       ├── main.rs         # Tauri entry point
│       ├── http_client.rs  # HTTP request engine
│       ├── storage.rs      # Local file storage
│       └── types.rs        # Shared types
├── public/                 # Static assets
└── package.json
```

## Data Storage

Diamond stores all data locally in your system's app data directory:

- **Windows**: `%APPDATA%\diamond\`
- **macOS**: `~/Library/Application Support/diamond/`
- **Linux**: `~/.local/share/diamond/`

Workspaces are saved as JSON files that can be version-controlled with Git.

## Roadmap

### MVP (Current)
- [x] HTTP request/response
- [x] Collections & folders
- [x] Environments & variables
- [x] Auth helpers (Bearer, Basic, API Key)
- [x] Request history
- [x] Light/dark themes

### v1.0
- [ ] Pre-request & test scripts
- [ ] Collection test runner
- [ ] OpenAPI/Swagger import
- [ ] Postman/Insomnia import
- [ ] CLI runner for CI/CD

### Future
- [ ] GraphQL support
- [ ] WebSocket client
- [ ] gRPC support
- [ ] Plugin system
- [ ] Team sync (optional)

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

```bash
# Run tests
npm run test

# Type check
npm run typecheck

# Lint
npm run lint
```

## License

MIT License — see [LICENSE](LICENSE) for details.

## Acknowledgments

Diamond is inspired by and grateful to:
- [Postman](https://postman.com) for pioneering API clients
- [Insomnia](https://insomnia.rest) for the open-source spirit
- [Hoppscotch](https://hoppscotch.io) for showing web can be fast
- [Tauri](https://tauri.app) for making native apps accessible

---

**Diamond** — APIs, polished. 💎
