# FORGE — Complete Project Context
> Paste this entire file into a new Claude IDE session.
> Working directory: `C:\Users\bharat.jain\Desktop\node`

---

## 1. What FORGE Is

FORGE is an AI-powered code inspection platform. Users upload or import existing code projects and then browse their project as an interactive file tree (React Flow canvas), click any `.go` file to open an AST (Abstract Syntax Tree) visualizer, and inspect the file's functions / types / imports in a detail panel.

**Current feature set (fully working):**
- JWT auth (register, login, forgot/reset password)
- Create blank project (name + language)
- **Import project from ZIP file** (drag-drop, up to 100 MB)
- **Import project from GitHub/GitLab URL** (shallow git clone)
- Interactive file-tree canvas (React Flow + dagre TB layout)
- Clicking any `.go` file opens the AST visualizer
- AST inspector right panel (functions, types, imports, variables)
- Resizable left sidebar + resizable right AI panel
- Dark theme design system (Electric Indigo #6366F1 accent)

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend language | Go 1.26 |
| HTTP framework | Fiber v2 (`github.com/gofiber/fiber/v2`) |
| Auth | JWT (`github.com/golang-jwt/jwt/v5`) |
| Database | PostgreSQL via `sqlx` + `lib/pq` |
| Git clone | `github.com/go-git/go-git/v5` |
| Config | Viper |
| Logging | `go.uber.org/zap` |
| Frontend | React 18 + TypeScript + Vite |
| State | Zustand |
| Server state | `@tanstack/react-query` |
| Flow canvas | `@xyflow/react` v12 |
| Tree layout | `dagre` |
| HTTP client | axios |
| Styling | Tailwind CSS v3 + CSS custom properties (tokens) |
| Icons | `lucide-react` |
| Toast | `react-hot-toast` |

---

## 3. Directory Structure

```
node/                               ← repo root / Go module root
├── go.mod                          ← module: forge
├── cmd/
│   └── main.go                     ← entry point, wires all handlers
├── api/
│   ├── handlers/
│   │   ├── auth.go                 ← register, login, forgot/reset password, me
│   │   ├── ast.go                  ← inspect, inspect-raw, tree, tree-raw (public)
│   │   ├── project.go              ← CRUD + file upload for projects
│   │   ├── upload.go               ← ZIP upload + GitHub/GitLab import (NEW)
│   │   └── errors.go               ← badRequest / notFound / internalError helpers
│   ├── middleware/
│   │   └── auth.go                 ← JWT middleware (sets ctx "userID")
│   └── router/
│       └── router.go               ← all routes wired here
├── internal/
│   ├── ast/
│   │   ├── parser.go               ← Go AST → FileInspection (functions/types/etc.)
│   │   └── tree.go                 ← Go AST → TreeNode (visual graph)
│   ├── auth/
│   │   ├── auth.go                 ← bcrypt hash, JWT sign/verify
│   │   └── user_repository.go      ← users table CRUD
│   ├── config/
│   │   └── config.go               ← loads env vars (DATABASE_URL, JWT_SECRET, PORT)
│   ├── db/
│   │   └── db.go                   ← sqlx.Connect wrapper
│   ├── logger/
│   │   └── logger.go               ← zap logger factory
│   ├── project/
│   │   └── project.go              ← Project/ProjectFile models + Repository struct
│   └── upload/
│       ├── processor.go            ← ProcessZip() → flat []FileEntry (NEW)
│       ├── github.go               ← ImportFromURL() + ProcessDirectory() (NEW)
│       └── processor_test.go       ← 7 unit tests, all passing (NEW)
├── db/
│   └── migrations/
│       ├── 000001_create_users.up.sql
│       ├── 000002_create_projects.up.sql
│       └── 000003_add_project_source.up.sql   ← adds source + original_url (NEW, already applied)
└── frontend/
    ├── src/
    │   ├── index.css               ← all design tokens inlined as :root {} (critical — not @imported)
    │   ├── styles/tokens.css       ← duplicate token file (kept for reference)
    │   ├── main.tsx                ← React Router setup, all routes
    │   ├── layouts/
    │   │   └── AppLayout.tsx       ← 3-panel flexbox: Navbar + [Sidebar | Canvas | RightPanel]
    │   ├── components/
    │   │   ├── Navbar.tsx          ← FORGE logo, project name, usage bar, icon buttons
    │   │   ├── Sidebar.tsx         ← nav items + project list + New Project button
    │   │   ├── RightPanel.tsx      ← AIChatPanel or ASTPanel depending on selected file
    │   │   ├── inspector/
    │   │   │   └── FileInspector.tsx  ← functions/types/imports detail panel
    │   │   ├── tree/
    │   │   │   ├── TreeCanvas.tsx  ← React Flow canvas with file tree (project page)
    │   │   │   ├── RootNode.tsx    ← root project node
    │   │   │   ├── FolderNode.tsx  ← folder node (expand/collapse)
    │   │   │   └── FileNode.tsx    ← file node (.go files trigger AST nav)
    │   │   ├── ast/
    │   │   │   ├── ASTFlowCanvas.tsx  ← AST graph (identifier/type/function nodes)
    │   │   │   ├── ASTNode.tsx
    │   │   │   └── ASTSidebar.tsx  ← upload panel + FileInspector on /ast page
    │   │   ├── ui/
    │   │   │   ├── Button.tsx      ← primary/secondary/ghost/danger variants
    │   │   │   ├── FileTypeIcon.tsx ← colored language badge
    │   │   │   ├── Tooltip.tsx     ← Radix-based tooltip
    │   │   │   ├── Badge.tsx
    │   │   │   └── Skeleton.tsx
    │   │   └── upload/
    │   │       └── UploadModal.tsx ← ZIP drag-drop + GitHub URL import (NEW)
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── RegisterPage.tsx
    │   │   ├── ForgotPasswordPage.tsx
    │   │   ├── ResetPasswordPage.tsx
    │   │   ├── ProjectPage.tsx     ← just renders <TreeCanvas /> full height
    │   │   ├── ASTPage.tsx         ← ASTFlowCanvas + ASTSidebar
    │   │   └── ProcessingPage.tsx  ← shows import result (file count, language, warnings) (NEW)
    │   ├── store/
    │   │   ├── fileTreeStore.ts    ← buildItemMap() + Zustand store for project tree
    │   │   ├── astViewerStore.ts   ← setData(tree, inspection, content, filename)
    │   │   ├── inspectorStore.ts   ← selected file inspection data
    │   │   ├── projectStore.ts     ← current active project
    │   │   └── processingStore.ts  ← import progress state (NEW)
    │   └── lib/
    │       ├── api.ts              ← axios instance + all API call functions
    │       ├── auth.ts             ← getToken / setToken / clearToken / isAuthenticated
    │       ├── utils.ts            ← cn(), getLanguageFromPath(), formatBytes()
    │       ├── astToGraph.ts       ← converts TreeNode → React Flow nodes/edges
    │       └── dagreLayout.ts      ← dagre layout helper
    ├── tailwind.config.ts
    └── vite.config.ts
```

---

## 4. Database Schema

**PostgreSQL database name: `Forge`** (capital F — on localhost:5432, user=postgres, password=Root123)

```sql
-- users
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  reset_token  TEXT,
  reset_expiry TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- projects (includes source/original_url from migration 000003)
CREATE TABLE projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  language     TEXT NOT NULL DEFAULT 'go',
  source       TEXT NOT NULL DEFAULT 'generated',  -- 'generated'|'upload'|'github'|'gitlab'
  original_url TEXT,                               -- set for github/gitlab imports
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- project_files
CREATE TABLE project_files (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path       TEXT NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, path)
);
```

---

## 5. Backend — Key Files (full content)

### cmd/main.go
```go
package main

import (
    "context"
    "fmt"
    "os"
    "os/signal"
    "syscall"
    "time"

    "forge/api/handlers"
    "forge/api/router"
    "forge/internal/auth"
    "forge/internal/config"
    "forge/internal/db"
    "forge/internal/logger"
    "forge/internal/project"

    "go.uber.org/zap"
)

func main() {
    cfg, _ := config.Load()
    log, _ := logger.New(cfg.Environment)
    defer log.Sync()

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    database, _ := db.Connect(ctx, cfg.DatabaseURL)
    defer database.Close()

    userRepo    := auth.NewPostgresUserRepository(database)
    projectRepo := project.NewRepository(database)

    authHandler    := handlers.NewAuthHandler(userRepo, cfg.JWTSecret, log)
    astHandler     := handlers.NewASTHandler(log)
    projectHandler := handlers.NewProjectHandler(projectRepo, log)
    uploadHandler  := handlers.NewUploadHandler(projectRepo, log)

    app := router.Setup(&router.Deps{
        AuthHandler:    authHandler,
        ASTHandler:     astHandler,
        ProjectHandler: projectHandler,
        UploadHandler:  uploadHandler,
        JWTSecret:      cfg.JWTSecret,
        Logger:         log,
    })

    go app.Listen(":" + cfg.ServerPort)

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    app.ShutdownWithTimeout(10 * time.Second)
}
```

### api/router/router.go — all routes
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/ast/inspect          (public, multipart file)
POST   /api/ast/inspect-raw      (public, JSON {fileName, content})
POST   /api/ast/tree             (public, multipart file)
POST   /api/ast/tree-raw         (public, JSON {fileName, content})

-- Protected (JWT required) --
GET    /api/auth/me
POST   /api/projects             (create blank project)
GET    /api/projects             (list user's projects)
POST   /api/projects/upload      ← NEW: ZIP import, returns {project, file_count, language, ...}
POST   /api/projects/import      ← NEW: GitHub/GitLab URL import
GET    /api/projects/:id
DELETE /api/projects/:id
POST   /api/projects/:id/files   (multipart, field "files", multiple .go files)
GET    /api/projects/:id/files/* (wildcard path)
```

Body limit is **110 MB** (to allow 100 MB ZIP uploads).

### internal/project/project.go — Repository methods
```
Create(ctx, userID, name, description, language)   → *Project
ListByUser(ctx, userID)                            → []Project
GetByID(ctx, id, userID)                           → *ProjectWithFiles
Delete(ctx, id, userID)                            → error
UpsertFile(ctx, projectID, path, content)          → *ProjectFile
GetFile(ctx, projectID, path)                      → *ProjectFile
CreateUpload(ctx, userID, name, source, originalURL) → *Project   ← NEW
UpdateLanguage(ctx, projectID, language)            → error       ← NEW
IsNotFound(err)                                    → bool
```

### internal/upload/processor.go — key constants and types
```go
MaxZipBytes  = 100 * 1024 * 1024  // 100MB ZIP limit
MaxFileBytes = 5 * 1024 * 1024    // 5MB per file
MaxFilesHard = 10000

type FileEntry struct {
    Path     string
    Content  string
    Language string
}
type ProcessResult struct {
    Files       []FileEntry
    FileCount   int
    SkippedDirs []string
    Language    string
    Warnings    []string
}

// Skipped directories: node_modules, vendor, .git, .svn, __pycache__,
// .next, .nuxt, dist, build, out, .cache, target, .gradle, bin, obj,
// coverage, .nyc_output, tmp, temp

// Skipped extensions: .exe .dll .so .dylib .o .a .lib .zip .tar .gz
// .rar .jpg .jpeg .png .gif .mp4 .mp3 .pdf .bin .dat

// ProcessZip(data []byte) (*ProcessResult, error)
//   — strips common GitHub prefix (e.g. "myrepo-main/")
//   — rejects path traversal (..)
//   — detects dominant language from extension counts

// ImportFromURL(repoURL string) (*ProcessResult, error)
//   — only allows github.com and gitlab.com
//   — shallow clone (depth=1) to temp dir, then ProcessDirectory()

// ProcessDirectory(dir string) (*ProcessResult, error)
//   — walks local directory with same skip rules
```

### api/handlers/upload.go — endpoints
```
POST /api/projects/upload
  - form field "file" = .zip file
  - Synchronous: processes ZIP, creates project, upserts all files
  - Returns: { project, file_count, language, skipped_dirs, warnings }
  - HTTP 201 on success

POST /api/projects/import
  - JSON body: { "url": "https://github.com/user/repo" }
  - Synchronous: shallow clones, creates project, upserts all files
  - Returns: { project, file_count, language, skipped_dirs, warnings }
  - HTTP 201 on success
  - Note: can take 10-60s depending on repo size
```

---

## 6. Frontend — Key Files

### src/main.tsx — routes
```tsx
<Routes>
  <Route path="/login"           element={<LoginPage />} />
  <Route path="/register"        element={<RegisterPage />} />
  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
  <Route path="/reset-password"  element={<ResetPasswordPage />} />

  <Route element={<AppLayout />}>   {/* auth guard inside AppLayout */}
    <Route path="/"        element={<Navigate to="/project" />} />
    <Route path="/project" element={<ProjectPage />} />
    <Route path="/ast"     element={<ASTPage />} />
  </Route>

  <Route path="/processing" element={<ProcessingPage />} />  {/* NEW */}
  <Route path="*"           element={<Navigate to="/" />} />
</Routes>
```

### src/layouts/AppLayout.tsx — 3-panel layout
```
[ Navbar (full width) ]
[ Sidebar | drag | Canvas (Outlet) | drag | RightPanel ]

- Sidebar: 160–400px, default 220px, drag right handle to resize
- RightPanel: 260–600px, default 380px, drag left handle to resize
- Toggle button (top-right of canvas) to hide/show RightPanel
- Auth guard: if (!isAuthenticated()) return <Navigate to="/login" />
- Hooks all declared before the auth guard (React rules)
```

### src/store/fileTreeStore.ts — key API
```ts
interface FTreeItem {
  id: string
  name: string
  type: 'root' | 'folder' | 'file'
  language?: string
  path?: string        // full path for files, e.g. "/cmd/main.go"
  content?: string     // file content (set from API)
  parentId?: string
  children?: string[]
}

useFileTreeStore: {
  items: Record<string, FTreeItem>
  expandedIds: Set<string>
  selectedFileId: string | null
  projectId: string | null
  setProject(project: ProjectWithFiles): void  // builds itemMap from flat files[]
  toggleFolder(id: string): void
  selectFile(id: string | null): void
  clear(): void
}

buildItemMap(project: ProjectWithFiles): Record<string, FTreeItem>
  // splits each file.path on "/" to create intermediate folder nodes
  // strips leading "/" from paths before splitting
getVisibleIds(items, expandedIds): string[]
```

### src/store/astViewerStore.ts
```ts
useASTViewerStore: {
  tree: TreeNode | null         // raw AST tree for canvas
  inspection: FileInspection | null  // for FileInspector panel
  content: string               // raw file content
  fileName: string
  setData(tree, inspection, content, fileName): void
  clear(): void
}
```

### src/lib/api.ts — API call functions
```ts
// All calls go to /api (baseURL), JWT auto-attached from localStorage

authApi.register(email, password)   → AuthResponse
authApi.login(email, password)      → AuthResponse
authApi.me()                        → User

astApi.inspectRaw(fileName, content) → FileInspection
astApi.treeRaw(fileName, content)    → TreeNode
astApi.inspectFile(file)            → FileInspection (multipart)
astApi.treeFile(file)               → TreeNode (multipart)

projectApi.create(name, desc, language)  → Project
projectApi.list()                        → { projects: Project[] }
projectApi.get(id)                       → ProjectWithFiles  // includes files[]
projectApi.delete(id)
projectApi.uploadFiles(projectId, files[]) → { uploaded: ProjectFile[] }
projectApi.getFile(projectId, path)       → ProjectFile
```

**Upload endpoints (NEW) — called directly via `api.post`:**
```ts
// ZIP upload
api.post('/projects/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
// Returns: { project: Project, file_count: number, language: string, skipped_dirs: string[], warnings: string[] }

// GitHub/GitLab import
api.post('/projects/import', { url: 'https://github.com/user/repo' })
// Returns same shape as above
```

### src/components/upload/UploadModal.tsx — behavior (NEW)
```
- Opens when "New Project" button in Sidebar is clicked
- Tab 1: drag-drop zone for .zip files (max 100MB)
  - on submit: POST /api/projects/upload
  - shows inline loading spinner
  - on success: fetches full project (GET /projects/:id), calls setProject(),
    invalidates ['projects'] query, closes modal, navigates to /project
- Tab 2: GitHub/GitLab URL input
  - validates URL format before enabling Import button
  - on submit: POST /api/projects/import
  - same on-success flow as ZIP
- Shows auto-excluded directories list as info pills
```

### src/components/tree/TreeCanvas.tsx — key behavior
```
- Reads from fileTreeStore (items, expandedIds, selectedFileId)
- Builds React Flow nodes with dagre TB layout
  - rootNode (200px wide), folderNode (172px), fileNode (152px), height 48px
- Clicking folder: toggleFolder(id)
- Clicking non-.go file: selectFile(id)
- Clicking .go file (isGoFile = true):
  1. If item.content exists: calls astApi.treeRaw + astApi.inspectRaw in parallel
  2. Calls astViewerStore.setData(tree, inspection, content, filename)
  3. Navigates to /ast
  4. If no content: navigates to /ast with toast to upload manually
```

### src/components/Sidebar.tsx — behavior
```
- Nav items: "Workflow" → /project, "AST Visualizer" → /ast
  - Active: indigo bg + 2px left border
- Project list: useQuery(['projects'], projectApi.list)
  - Clicking project: projectApi.get(id) → setProject(full) → navigate('/project')
- "New Project" button: opens UploadModal (changed from old NewProjectModal)
  - NewProjectModal (blank project creation) still exists in file but not triggered by button
```

---

## 7. Design System

**Colors (CSS custom properties in src/index.css :root block):**
```css
--bg-base:       #0A0A0F   /* near-black background */
--bg-surface:    #111118   /* card / sidebar bg */
--bg-raised:     #1A1A24   /* input / elevated surfaces */
--bg-overlay:    #22222F   /* tooltip / dropdown bg */
--accent:        #6366F1   /* Electric Indigo — primary CTA */
--accent-hover:  #818CF8
--accent-muted:  rgba(99,102,241,0.12)
--text-primary:  #F1F5F9
--text-secondary: #94A3B8
--text-disabled: #475569
--lang-go:       #2DD4BF   /* teal */
--lang-ts:       #60A5FA   /* blue */
--lang-py:       #F59E0B   /* amber */
--color-error:   #EF4444
--color-success: #10B981
--color-warning: #F59E0B
--font-mono: 'JetBrains Mono', 'Fira Code', monospace
```

**IMPORTANT CSS NOTE:** All tokens are inlined directly in `src/index.css` as a `:root {}` block — they are NOT @imported from a separate file. This is required because `@import` must come before `@tailwind` directives, and the import was silently ignored. The `src/styles/tokens.css` file exists but is unused.

---

## 8. Running the Project

### Start backend
```bash
cd C:\Users\bharat.jain\Desktop\node
go run ./cmd/main.go
# Listens on :8080
```

### Start frontend dev server
```bash
cd C:\Users\bharat.jain\Desktop\node\frontend
npm run dev
# Vite proxy forwards /api → localhost:8080
```

### Database
```
Host: localhost:5432
DB name: Forge   (capital F!)
User: postgres
Password: Root123
psql: C:\Program Files\PostgreSQL\18\bin\psql.exe
```

### Run migration (if re-setting up)
```bash
PGPASSWORD=Root123 "/c/Program Files/PostgreSQL/18/bin/psql" -U postgres -d Forge -h localhost -f db/migrations/000001_create_users.up.sql
PGPASSWORD=Root123 "/c/Program Files/PostgreSQL/18/bin/psql" -U postgres -d Forge -h localhost -f db/migrations/000002_create_projects.up.sql
PGPASSWORD=Root123 "/c/Program Files/PostgreSQL/18/bin/psql" -U postgres -d Forge -h localhost -f db/migrations/000003_add_project_source.up.sql
```

### Run upload unit tests
```bash
go test ./internal/upload/... -v
# 7 tests, all passing
```

### Build
```bash
go build ./...                                    # backend
cd frontend && npm run build                      # frontend
```

---

## 9. Key Architectural Decisions

1. **No WebSocket** — The codebase has no WS infrastructure. ZIP/GitHub imports are **synchronous** HTTP calls. The frontend shows a loading spinner in the modal while the request completes (can take up to ~60s for large repos).

2. **Flat file storage** — Files are stored as flat rows in `project_files` with path like `/cmd/main.go`. The tree hierarchy is reconstructed client-side in `buildItemMap()` by splitting on `/`.

3. **Three-panel flexbox** (not CSS Grid) — Makes dynamic drag-resize trivial: sidebar has explicit `width`, center has `flex: 1`, right panel has explicit `width`.

4. **Dual independent drag resize** — Uses separate `useRef` sets (`sbDragging/sbStartX/sbStartW` for sidebar, `rpDragging/rpStartX/rpStartW` for right panel) in a single `mousemove` handler.

5. **React hooks before auth guard** — `isAuthenticated()` guard is placed after all `useState`/`useEffect`/`useRef` declarations in `AppLayout` to satisfy React Rules of Hooks.

6. **CSS tokens inlined** — All CSS variables are in a `:root {}` block directly in `index.css`, not `@import`ed, because CSS spec ignores `@import` after `@tailwind` directives.

7. **Upload handler uses existing project.Repository** — The `UploadHandler` takes a `*project.Repository` (concrete struct, not interface) because the rest of the codebase follows the same pattern.

8. **File paths stored with leading slash** — When the upload handler upserts files, it prepends "/" to paths: `repo.UpsertFile(ctx, proj.ID, "/"+fe.Path, fe.Content)`. The `fileTreeStore` strips the leading slash: `pf.path.replace(/^\//, '')`.

---

## 10. Known Limitations / Future Work

- GitHub import is synchronous and blocks the HTTP request. Large repos (>500 files) can be slow. A future improvement would be to make this async with WebSocket progress.
- The `NewProjectModal` (blank project creation) is still in `Sidebar.tsx` but not triggered by the "New Project" button anymore (which now opens UploadModal). To re-enable blank project creation, either add a tab to UploadModal or restore the button as a dropdown.
- The `/processing` route (`ProcessingPage`) is registered but is currently only used if you navigate to it manually with state. The UploadModal's success flow navigates directly to `/project`.
- The `src/styles/tokens.css` file is a dead copy of the tokens — only `src/index.css` is loaded.
- No WebSocket, no AI code generation endpoint, no Monaco editor integration yet.
