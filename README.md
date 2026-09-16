# Chillverse Exploration

Chillverse is a browser-based exploration game built around four living maps. Explore regions, discover relics, send expeditions, and keep a journal of what you find.

## Standalone codebase

This repository is intentionally independent of Grok, xAI, hosted preview brokers, and platform-specific environment injection. It runs as a conventional Vite/TanStack Start application and can be developed locally or deployed to any Node-compatible host.

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:8080` in a browser.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

## Production preview

```bash
npm run build
npm run preview
```

The game stores local progress in the browser. No API keys, hosted auth broker, or external game service is required for the core experience.

## Project structure

- `src/game/` contains the game state, world generation, screens, controls, and audio.
- `src/routes/` contains the TanStack Start route shell.
- `public/` contains the small static game assets and PWA files.
- `scripts/` contains deterministic repository checks and utilities.

## License

MIT
