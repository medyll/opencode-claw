# plan-opencode-claw

## Contexte

Construire **codeclaw** — un orchestrateur léger qui enveloppe opencode.
Objectif immédiat : avoir un espace de travail utilisable aujourd'hui.

---

## Architecture retenue

```
┌─────────────────────────────────────────────┐
│  codeclaw  (serveur Node/TS, localhost:3000) │
│                                             │
│  ┌─────────────────┐  ┌───────────────────┐ │
│  │  UI chat        │  │  UI dashboard     │ │
│  │  intention →    │  │  projets / statuts│ │
│  │  dispatch       │  │  pile d'exécution │ │
│  └─────────────────┘  └───────────────────┘ │
│                                             │
│  ┌─────────────────────────────────────────┐│
│  │  iframe → opencode web (localhost:4096) ││
│  └─────────────────────────────────────────┘│
└──────────────────────┬──────────────────────┘
                       │ @opencode-ai/sdk
┌──────────────────────▼──────────────────────┐
│  opencode serve  (localhost:4096)           │
│  sessions / agents / tools / LSP            │
└─────────────────────────────────────────────┘
```

---

## Stack

- **Runtime** : Node.js + TypeScript
- **Serveur** : Express ou Fastify (léger)
- **Frontend** : HTML + CSS via `@medyll/css-base` (chemin local à fournir)
- **SDK** : `@opencode-ai/sdk`
- **Stockage** : JSON local (project registry + execution queue)

---

## Phases

### Phase 1 — Squelette serveur (30 min)

- [ ] Init projet Node/TS
- [ ] Serveur HTTP sur `localhost:3000`
- [ ] Route `/` → shell HTML avec iframe `localhost:4096`
- [ ] Intégration `@medyll/css-base`
- **Livrable** : iframe opencode visible dans codeclaw ✓

### Phase 2 — Project registry (30 min)

- [ ] Fichier `projects.json` : nom, chemin, description, statut
- [ ] Route `/api/projects` GET/POST
- [ ] Vue dashboard : liste des projets avec vrais noms (pas des lettres)
- **Livrable** : vue globale lisible des projets ✓

### Phase 3 — Execution queue (45 min)

- [ ] Fichier `queue.json` : liste ordonnée de projets à exécuter
- [ ] Interface : toggle on/off par projet
- [ ] Route `/api/queue` GET/POST/DELETE
- [ ] Runner : appelle opencode SDK sur chaque projet de la queue
- **Livrable** : pile d'exécution configurable + kill switch direct ✓

### Phase 4 — Dashboard résultats (30 min)

- [ ] Lecture des sessions opencode via SDK
- [ ] Vue "ce qui s'est passé" par projet, par date
- [ ] Statuts lisibles : en cours / terminé / erreur
- **Livrable** : vue matin — ce qui a tourné cette nuit ✓

---

## Points d'incertitude

| Point | Status |
|-------|--------|
| iframe `localhost:3000` → `localhost:4096` | ✓ validé (HTTP→HTTP passe) |
| `@medyll/css-base` chemin local | en attente |
| opencode SDK : auth / config | à vérifier au démarrage |

---

## Prochaine action

Fournir le chemin local de `@medyll/css-base` → lancer Phase 1.
