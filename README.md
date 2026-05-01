# CodeClaw

> Orchestrateur visuel pour [opencode](https://opencode.ai) avec dashboard multi-projets, TUI en temps réel et gestion intelligente des sessions.

**Version:** 1.0.0  
**Status:** ✅ Release-ready

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](CHANGELOG.md)

---

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+ 
- [opencode](https://opencode.ai) installé et fonctionnel
- pnpm (recommandé) ou npm

### Installation

```bash
# Cloner le repo
git clone https://github.com/medyll/opencode-claw.git
cd opencode-claw

# Installer les dépendances
pnpm install

# Démarrer en mode développement
pnpm dev
```

L'application est accessible sur **http://localhost:3000**

### Commandes disponibles

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Démarre le serveur de développement (tsx) |
| `pnpm build` | Compile le TypeScript vers `dist/` |
| `pnpm start` | Démarre le serveur de production |
| `pnpm lint` | Vérifie le code avec ESLint |

---

## ⚙️ Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine :

```env
PORT=3000
OPENCODE_URL=http://localhost:4096
CSS_BASE_PATH=node_modules/@medyll/css-base/dist
```

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PORT` | `3000` | Port du serveur Express |
| `OPENCODE_URL` | `http://localhost:4096` | URL de l'instance opencode |
| `CSS_BASE_PATH` | `node_modules/@medyll/css-base/dist` | Chemin vers les assets css-base |

---

## ✨ Features

### Dashboard multi-projets
- Liste de tous vos projets opencode
- Statut en temps réel (active/running/error)
- Navigation rapide avec Ctrl+K

### TUI en temps réel
- Chat avec opencode via SDK (sans iframe)
- Streaming SSE des réponses
- Support multi-session par projet

### Zone info
- **Header projet** — nom, path, statut
- **Stats exécutions** — today/week, success rate
- **Sessions list** — basculez entre sessions actives
- **Historique** — 5 dernières exécutions avec export .txt
- **Skills panel** — skills disponibles

### Multi-agent
- **Priority queue** — 4 niveaux (low/normal/high/urgent)
- **Auto-decay** — priorité baisse après 5min d'inactivité
- **Session switcher** — changez de contexte instantanément

### Personnalisation
- **Thème dark/light** — switch avec persistance
- **Navigation clavier** — Ctrl+K, flèches, Enter

---

## 📖 Usage

### 1. Ajouter un projet

Dans la sidebar gauche :
- Remplissez **Nom**, **Chemin** (absolu), **Description** (optionnel)
- Cliquez sur **+ Ajouter**

### 2. Ouvrir un projet

Cliquez sur un projet dans la sidebar :
- La TUI s'ouvre à gauche
- La zone info s'affiche à droite
- Une session opencode est créée automatiquement

### 3. Envoyer un prompt

Dans la zone TUI :
- Tapez votre message
- Appuyez sur **Entrée** ou cliquez sur **↑**
- La réponse stream en temps réel

### 4. Gérer les sessions

Cliquez sur le badge "**X sessions**" en header TUI :
- Voir toutes les sessions actives
- Changer de session (clic)
- Modifier la priorité (boutons colorés)

### 5. Exécuter opencode

Dans la zone info :
- Bouton **Exécuter** → ajoute le projet à la queue
- Le queue runner lance `opencode run` automatiquement
- Historique des exécutions mis à jour

---

## 🏗️ Architecture

```
opencode-claw/
├── src/
│   ├── server.ts          # Serveur Express + API REST
│   ├── routes/
│   │   └── routesSdk.ts   # Routes proxy SDK opencode
│   └── data/              # Persistence JSON
│       ├── projects.json
│       ├── queue.json
│       ├── executions.json
│       └── sessions.json  # Métadonnées sessions (priority, etc.)
├── public/
│   └── index.html         # Dashboard SPA (vanilla JS + CSS inline)
├── skills/                # Skills opencode
├── bmad/                  # Artefacts BMAD (status, stories, etc.)
└── CHANGELOG.md           # Historique des versions
```

### Flux d'exécution

```
Dashboard (public/index.html)
  │  POST /api/oc/sessions/:id/prompt
  ▼
routesSdk.ts (proxy SDK opencode)
  │  opencode.session.promptAsync()
  ▼
opencode (SSE stream)
  │  events: assistant, message.part.updated
  ▼
Dashboard (streaming TUI)
```

### Queue Runner

```
POST /api/queue { action: 'add', projectId }
  ▼
queue.json (file d'attente)
  ▼
Runner (setInterval 3s)
  │  opencode run (cwd = project.path)
  ▼
executions.json (historique)
```

---

## 📡 API REST

### Projets

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/projects` | Liste tous les projets |
| `POST` | `/api/projects` | Crée un projet |
| `DELETE` | `/api/projects/:id` | Supprime un projet |

### Sessions (SDK Proxy)

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/oc/sessions?directory=xxx` | Liste sessions |
| `POST` | `/api/oc/sessions` | Crée une session |
| `GET` | `/api/oc/sessions/:id` | Détails session |
| `GET` | `/api/oc/sessions/:id/messages` | Messages session |
| `POST` | `/api/oc/sessions/:id/prompt` | Envoie prompt |
| `POST` | `/api/oc/sessions/:id/priority` | Définit priorité |
| `DELETE` | `/api/oc/sessions/:id` | Supprime session |
| `GET` | `/api/oc/events` | SSE event stream |

### Queue

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/queue` | État de la queue |
| `POST` | `/api/queue` | Modifier (add/remove/clear/start/stop) |

### Exécutions

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/executions?projectId=xxx&limit=50` | Historique |
| `GET` | `/api/executions/summary` | Stats (today/total/success/error) |
| `GET` | `/api/executions/:id/logs` | Export logs (.txt) |

### Skills

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/skills` | Liste des skills disponibles |

### Santé

```
GET /api/health
→ { status, service, port, opencode, timestamp }
```

---

## 🎨 Types TypeScript

```typescript
interface Project {
  id: string;           // "proj-{timestamp}"
  name: string;
  path: string;         // chemin absolu
  description: string;
  status: 'active' | 'running' | 'error';
  lastRun: string | null;
  createdAt: string;    // ISO 8601
}

interface SessionMeta {
  id: string;
  projectId: string;
  directory: string;
  title: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  lastActivity: string;
  createdAt: string;
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

## ⚠️ Limites connues

- **Usage local uniquement** — aucune authentification
- **Persistence JSON** — pas adapté multi-processus
- **Mono-instance** — pas de locking fichier
- `opencode run` doit être dans le `PATH` système

> **Pour déploiement production :** Migrer vers SQLite + ajouter authentification.

---

## 📝 License

MIT — voir [LICENSE](LICENSE)

---

## 🔗 Liens

- [CHANGELOG](CHANGELOG.md) — Historique des versions
- [opencode](https://opencode.ai) — L'outil orchestré
- [@medyll/css-base](https://github.com/medyll/css-base) — Système de design
