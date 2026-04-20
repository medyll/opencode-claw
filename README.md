# CodeClaw — Documentation

> Orchestrateur léger pour [opencode](https://opencode.ai) avec dashboard visuel et execution queue.

---

## Démarrage rapide

```bash
pnpm install
pnpm dev          # ts-node src/server.ts → http://localhost:3000
pnpm build        # compile vers dist/
pnpm start        # node dist/server.js
```

### Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PORT` | `3000` | Port du serveur Express |
| `OPENCODE_URL` | `http://localhost:4096` | URL de l'instance opencode |
| `CSS_BASE_PATH` | `node_modules/@medyll/css-base/dist` | Chemin vers les assets css-base |

Exemple `.env` :
```env
PORT=3000
OPENCODE_URL=http://localhost:4096
```

---

## Architecture

```
opencode-claw/
├── src/
│   ├── server.ts          # Serveur Express + queue runner
│   └── data/              # Persistence JSON (gitignorés)
│       ├── projects.json
│       ├── queue.json
│       └── executions.json
├── public/
│   └── index.html         # Dashboard SPA (vanilla JS)
├── dist/                  # Build TypeScript (gitignoré)
└── bmad/                  # Artefacts BMAD
```

### Flux d'exécution

```
Dashboard (index.html)
  │  POST /api/queue { action: 'add', projectId }
  ▼
queue.json  ←──────── Queue runner (setInterval 3s)
                            │  opencode run (cwd = project.path)
                            ▼
                      executions.json
```

---

## API REST

### Projets

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/projects` | Liste tous les projets |
| `POST` | `/api/projects` | Crée un projet |

**POST /api/projects** — body :
```json
{ "name": "mon-projet", "path": "/chemin/absolu", "description": "optionnel" }
```

**Statuts projet :** `active` · `running` · `error`

---

### Queue

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/queue` | État de la queue |
| `POST` | `/api/queue` | Modifier la queue |
| `POST` | `/api/queue/run` | Démarrer le runner |
| `POST` | `/api/queue/stop` | Arrêter le runner |

**POST /api/queue** — actions disponibles :

| `action` | `projectId` requis | Effet |
|----------|--------------------|-------|
| `add` | ✓ | Ajoute à la queue (dédupliqué) |
| `remove` | ✓ | Retire de la queue |
| `clear` | ✗ | Vide la queue |
| `start` | ✗ | Démarre le runner |
| `stop` | ✗ | Arrête le runner |

---

### Exécutions

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/executions` | Historique (query: `projectId`, `limit` max 200) |
| `GET` | `/api/executions/summary` | Stats du jour (success/error/total) |

---

### Santé

```
GET /api/health
→ { status, service, port, opencode, timestamp }
```

---

## Types TypeScript

```typescript
interface Project {
  id: string;           // "proj-{timestamp}"
  name: string;
  path: string;         // chemin absolu du projet
  description: string;
  status: 'active' | 'running' | 'error';
  lastRun: string | null;
  createdAt: string;    // ISO 8601
}

interface Execution {
  id: string;           // "exec-{timestamp}"
  projectId: string;
  projectName: string;
  status: 'success' | 'error';
  duration: number;     // ms
  error: string | null;
  startedAt: string;    // ISO 8601
  completedAt: string;  // ISO 8601
}
```

---

## Dashboard UI

Interface SPA vanilla JS servie depuis `public/index.html`.

**Layout :**
- Header : statuts serveur + opencode
- Sidebar gauche : Execution Queue + liste Projets
- Zone principale : iframe opencode + log panel + historique

**Composants clés :**

| Fonction JS | Description |
|-------------|-------------|
| `loadProjects()` | Rafraîchit la liste des projets |
| `loadQueue()` | Rafraîchit la queue + état du runner |
| `loadHistory()` | Charge l'historique du jour |
| `addProject()` | Soumet le formulaire d'ajout |
| `addToQueue(id)` | Ajoute un projet à la queue |
| `removeFromQueue(id)` | Retire un projet de la queue |
| `esc(str)` | Échappe le HTML (protection XSS) |

**Polling :** toutes les 5 secondes via `setInterval`.

**CSS :** `@medyll/css-base` servi via `/css-base/app.css` + variables CSS custom (`--color-bg`, `--color-primary`, `--color-muted`, etc.).

---

## Queue Runner

- Vérifie la queue toutes les **3 secondes**
- Un seul job à la fois (`running: true` pendant l'exécution)
- Lance `opencode run` dans le `cwd` du projet via `child_process.spawn`
- Logs stdout/stderr préfixés par le nom du projet
- En cas d'erreur : statut projet → `error`, log dans executions.json
- Historique limité à **100 exécutions**

---

## Persistence

Trois fichiers JSON dans `src/data/` (gitignorés) :

| Fichier | Structure |
|---------|-----------|
| `projects.json` | `{ projects: Project[] }` |
| `queue.json` | `{ queue: string[], running: boolean, lastExecution: string\|null }` |
| `executions.json` | `{ executions: Execution[] }` |

> **Note :** Pas de locking fichier — usage mono-instance uniquement. Pour un déploiement multi-processus, migrer vers SQLite.

---

## Limites connues

- Usage **local uniquement** — aucune authentification
- Persistence **JSON flat file** — pas adapté à la haute charge
- `opencode run` doit être dans le `PATH` système
