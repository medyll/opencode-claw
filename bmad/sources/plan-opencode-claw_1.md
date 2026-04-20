# plan-opencode-claw

## Genèse et besoin réel

### Le problème d'origine

L'environnement de travail actuel manque d'une couche d'orchestration globale. Les outils existants (OpenClaw, opencode) couvrent chacun une partie du besoin, mais aucun ne couvre l'ensemble. La skill **place-de-greve**, développée dans OpenClaw pour combler ce manque, a absorbé trop de responsabilités à la fois : orchestration, visualisation, exécution autonome, gestion de statuts. Elle est devenue instable, difficile à contrôler, et coûteuse à maintenir.

### Ce que opencode a résolu partiellement

opencode est le seul outil qui offre une vue multi-projets nativement. Il donne le contrôle et la visibilité sur l'avancement du code. Mais il présente deux lacunes majeures :

- **Les projets sont représentés par une lettre et une couleur** — illisible dès que le nombre de projets dépasse trois.
- **Il n'a pas de pile d'exécution planifiée** — il est réactif, pas autonome. Il ne peut pas "travailler cette nuit pendant que tu dors".

### Le besoin fondamental

Pouvoir configurer le soir une liste de projets à exécuter en parallèle, aller dormir, et retrouver le matin un rapport lisible de ce qui s'est passé — par nom de projet, pas par lettre colorée.

Ce besoin se décompose en trois parties :
1. **Vue globale lisible** des projets et de leur statut
2. **Pile d'exécution configurable** avec un on/off par projet et un kill switch direct
3. **Dashboard résultats** : ce qui a tourné, ce qui a réussi, ce qui a échoué

---

## Ce qu'est codeclaw

codeclaw est un orchestrateur léger qui enveloppe opencode. Il ne code pas. Il ne touche pas au filesystem. Il n'a pas de mission métier. Il est la couche de sens et de contrôle au-dessus d'opencode.

Son périmètre strict :
- Tenir un **registre de projets** avec de vrais noms, chemins, descriptions, statuts
- Exposer une **pile d'exécution** configurable
- Piloter opencode via le **SDK officiel** `@opencode-ai/sdk`
- Afficher les résultats dans une **interface lisible**
- Embarquer l'UI opencode dans un **iframe** pour ne pas quitter l'espace de travail

Ce qu'il n'est pas : place-de-greve, un agent IA, un gestionnaire de tâches complexe, un réinventeur d'opencode.

---

## Écosystème technique

### opencode

- **Repo** : `github.com/sst/opencode` — MIT, sources ouvertes
- **Mode serveur** : `opencode serve` ou `opencode web --port 4096` — expose une API REST OpenAPI 3.1
- **SDK** : `@opencode-ai/sdk` (JS/TS, type-safe, généré depuis OpenAPI)
- **Architecture** : client/server — le TUI est juste un client parmi d'autres
- **Agents** : `build` (défaut), `plan` (read-only), `@general` (sous-agent), agents custom via fichiers `.md`
- **Sessions** : persistées en SQLite local
- **Multi-provider** : Claude, OpenAI, Gemini, Qwen, Ollama, etc.
- **ACP** : `opencode acp` — Agent Communication Protocol via stdin/stdout nd-JSON, permet des processus détachés
- **Non-interactif** : `opencode run "..."` — utilisable en scripting/automation

### OpenClaw

- Environnement principal de travail
- Stable — les problèmes sont dans ce qui tourne dedans, pas dans l'outil lui-même
- Skills actives : BMAD, maturation, place-de-greve (à déprécier progressivement)
- Agent principal : **Synapses** (défini dans `agents.md`)
- Orchestration via protocole **ACP**

### @medyll/css-base

- Lib CSS maison (chemin local à fournir)
- Utilisée pour le styling de codeclaw
- Intégration via import local dans le projet Node

---

## Architecture retenue

```
┌─────────────────────────────────────────────────────────────┐
│  TOI                                                        │
│  intention / configuration queue / lecture résultats        │
└───────────────────────┬─────────────────────────────────────┘
                        │ browser localhost:3000
┌───────────────────────▼─────────────────────────────────────┐
│  codeclaw  (serveur Node/TS)                                │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │  chat / intent   │  │  dashboard                       │ │
│  │  → dispatch      │  │  projets (vrais noms)            │ │
│  │  → Claude API    │  │  statuts / résultats             │ │
│  └──────────────────┘  │  pile d'exécution (on/off)       │ │
│                        │  kill switch                     │ │
│                        └──────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  iframe → opencode web (localhost:4096)                 ││
│  │  UI opencode complète embarquée                        ││
│  └─────────────────────────────────────────────────────────┘│
└───────────────────────┬─────────────────────────────────────┘
                        │ @opencode-ai/sdk (HTTP REST)
┌───────────────────────▼─────────────────────────────────────┐
│  opencode  (opencode web --port 4096)                       │
│  sessions / agents / tools / LSP / MCP / SQLite             │
└─────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  FILESYSTEM / CODEBASE                                      │
│  projets, AGENTS.md par projet, code source                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| Runtime | Node.js + TypeScript |
| Serveur HTTP | Express ou Fastify |
| Frontend | HTML + CSS (`@medyll/css-base` local) |
| SDK opencode | `@opencode-ai/sdk` |
| Stockage | JSON local (`projects.json`, `queue.json`) |
| Iframe | `opencode web --port 4096` |
| Intent parsing | Claude API (Anthropic) |

---

## Validation technique

| Scénario | Statut |
|----------|--------|
| `file://` → iframe `localhost:4096` | ✗ bloqué (mixed content) — attendu |
| `http://localhost:3000` → iframe `localhost:4096` | ✓ passera (HTTP→HTTP même origine locale) |
| opencode web en onglet direct | ✓ validé — UI propre et fonctionnelle |
| CSP / X-Frame-Options côté opencode | ✓ pas de blocage détecté |

Le test réel de l'iframe se fera au lancement de la Phase 1, quand codeclaw tournera lui-même sur `localhost:3000`.

---

## Plan de développement

### Phase 1 — Squelette serveur (≈30 min)

**Objectif** : avoir l'iframe opencode visible dans codeclaw

- [ ] Init projet Node/TS (`npm init`, `tsconfig.json`)
- [ ] Serveur HTTP sur `localhost:3000` (Express/Fastify)
- [ ] Route `/` → shell HTML avec iframe `http://localhost:4096`
- [ ] Intégration `@medyll/css-base` (chemin local)
- [ ] Layout : header codeclaw + zone iframe

**Livrable** : opencode s'affiche dans l'interface codeclaw

---

### Phase 2 — Project registry (≈30 min)

**Objectif** : remplacer les lettres colorées par de vrais noms

- [ ] `projects.json` : `{ id, name, path, description, status, lastSession }`
- [ ] Route `GET /api/projects` — liste des projets
- [ ] Route `POST /api/projects` — ajouter un projet
- [ ] Vue dashboard : cards projets avec nom complet, statut, chemin
- [ ] Connexion SDK : lire les sessions opencode et associer au projet

**Livrable** : vue globale lisible de tous les projets

---

### Phase 3 — Execution queue (≈45 min)

**Objectif** : pile d'exécution nocturne configurable

- [ ] `queue.json` : liste ordonnée `[{ projectId, enabled, priority, prompt }]`
- [ ] Route `GET/POST/DELETE /api/queue`
- [ ] UI : toggle on/off par projet, réordonnancement, kill switch global
- [ ] Runner : boucle qui itère la queue, ouvre une session opencode par projet via SDK
- [ ] Kill switch : arrêt propre de la queue en cours

**Livrable** : "je coche mes projets, je dors, ça tourne"

---

### Phase 4 — Dashboard résultats (≈30 min)

**Objectif** : vue matin — ce qui s'est passé cette nuit

- [ ] Lecture des sessions terminées via SDK opencode
- [ ] Affichage par projet : durée, statut, résumé (si disponible)
- [ ] Indicateurs visuels : succès / erreur / en cours
- [ ] Persistance légère des runs dans `history.json`

**Livrable** : rapport lisible au réveil

---

## Dépendances et prérequis

- `opencode web --port 4096` doit tourner en arrière-plan avant de lancer codeclaw
- Chemin local `@medyll/css-base` à fournir avant Phase 1
- Clé API Claude (ou autre provider) configurée dans opencode

---

## Ce qui disparaît

**place-de-greve** dans sa forme actuelle est dépréciée par codeclaw. Son besoin légitime — l'exécution autonome — est absorbé par la Phase 3 de façon contrôlée, visible, et avec un kill switch direct.

---

## Prochaine action

Fournir le chemin local de `@medyll/css-base` → lancer Phase 1.
