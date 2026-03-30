# forge-frontend

React + TypeScript + Vite frontend for the FORGE platform.

## Prerequisites
- Node.js 20+
- forge-backend running on port 8080

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Build

```bash
npm run build
# Output is in dist/ — deploy to Vercel, Netlify, or Cloudflare Pages
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| VITE_API_URL | http://localhost:8080 | Go backend URL |
| VITE_WS_URL | ws://localhost:8080 | WebSocket URL |
