# forge-frontend — Claude Code Context

## What this repo is

The React + TypeScript frontend for FORGE — an AST visualizer and Go code prototyping tool
that lets developers explore Go file structure as interactive node graphs and edit AST nodes
through a sidebar UI.

## Tech stack

- React 18 + TypeScript (strict mode)
- Vite
- Tailwind CSS
- @xyflow/react (React Flow v12) for the AST node graph canvas
- Zustand for global state (multi-tab TabState pattern)
- @tanstack/react-query v5 for server state / API mutations
- Axios for HTTP
- dagre for automatic hierarchical graph layout
- lucide-react for icons
- react-hot-toast for notifications

## Directory structure

```
src/
├── components/
│   ├── ast/          AST canvas, sidebar, node palette, individual node card
│   ├── dashboard/    Dashboard components
│   ├── inspector/    AST Inspector panel
│   ├── tree/         React Flow tree visualizer nodes and canvas
│   ├── ui/           Base UI components
│   └── upload/       Upload modal and processing components
├── layouts/          App shell layouts
├── lib/              Utilities — api.ts, astToGraph.ts, dagreLayout.ts
├── pages/            Page components — ASTPage.tsx is the main canvas page
├── store/            Zustand stores — astViewerStore.ts (core state)
└── styles/           Global CSS
```

## Key files

- `src/store/astViewerStore.ts` — multi-tab state with TabState; all AST mutations go here
- `src/lib/astToGraph.ts` — converts TreeNode tree → React Flow nodes/edges with filtering
- `src/components/ast/ASTFlowCanvas.tsx` — the React Flow canvas
- `src/components/ast/ASTNode.tsx` — individual node card component
- `src/components/ast/ASTSidebar.tsx` — info/edit/file panel on the right
- `src/components/ast/NodePalette.tsx` — left palette with node types and Go templates
- `src/pages/ASTPage.tsx` — main page layout (tabs, breadcrumb, palette, canvas, sidebar)

## Backend

This frontend talks to `forge-backend` (separate repo).
Local dev: backend runs on http://localhost:8080
API calls go through the Vite proxy configured in vite.config.ts.

## Key rules

- TypeScript strict mode — no `any`, no `@ts-ignore`
- Functional components only
- React Query for all server state — never useEffect for fetching
- `useActiveTab()` selector returns the active TabState; use it everywhere per-tab data is needed
- Node IDs use `crypto.randomUUID()` for custom/palette nodes
- `_edited: 'true'` prop convention flags manually edited AST nodes (shows amber dot)

## Environment variables

Copy .env.example to .env.local before running locally.
VITE_API_URL and VITE_WS_URL must point to the running forge-backend.

## Commands

```
npm run dev      Start dev server (port 3000)
npm run build    Build for production (output: dist/)
npm run preview  Preview production build locally
npx tsc --noEmit TypeScript check (must be zero errors)
```
