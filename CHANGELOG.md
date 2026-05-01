# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Multi-agent workflows avec priorisation automatique
- Intégration approfondie des skills ferule
- Support des webhooks pour notifications externes

## [1.0.0] - 2026-05-01

### Added
- **Dashboard multi-projets** — Liste des projets avec statut (active/running/error)
- **TUI temps réel** — Chat avec opencode via SDK, streaming SSE sans iframe
- **Multi-session** — Plusieurs sessions actives par projet avec dropdown et switcher
- **Priority queue** — 4 niveaux de priorité (low/normal/high/urgent) avec decay auto après 5min
- **Skills panel** — Liste des skills disponibles dans la zone info
- **Theme toggle** — Switch dark/light mode avec persistance localStorage
- **Export logs** — Téléchargement des logs d'exécution en fichier .txt
- **Navigation clavier** — Ctrl+K spotlight pour accéder rapidement aux projets
- **Zone info complète** — Header projet, stats exécutions, sessions list, historique, skills
- **Session persistence** — Réutilisation des sessions existantes
- **Bouton Exécuter** — Lancer opencode via queue runner depuis la zone info
- **Connection indicator** — Indicator de connexion à opencode dans la TUI
- **Clear button + auto-scroll** — Contrôles utilisateur pour la zone TUI

### Changed
- Migration de l'iframe opencode vers le SDK @opencode-ai/sdk
- Architecture 2 colonnes (TUI gauche + info droite) par projet
- Amélioration du polling (15s serveur, 10s opencode)

### Fixed
- Gestion des erreurs de connexion opencode (message utilisateur-friendly)
- Synchronisation des sessions entre projets
- Scroll automatique de la TUI pendant le streaming

## [0.1.0] - 2026-04-20

### Added
- Initial release
- Serveur Express + TypeScript
- API REST: /api/projects, /api/queue, /api/executions
- Queue runner avec execution automatique
- Dashboard vanilla JS avec polling
- Persistence JSON (projects, queue, executions)
- Intégration @medyll/css-base

[Unreleased]: https://github.com/medyll/opencode-claw/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/medyll/opencode-claw/releases/tag/v1.0.0
[0.1.0]: https://github.com/medyll/opencode-claw/releases/tag/v0.1.0
