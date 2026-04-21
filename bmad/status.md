# Status — opencode-claw

**Generated:** 2026-04-21 | **Phase:** in-progress | **Progress:** 85%  
**Active role:** Developer

## Dimensions

**Marketing:** CodeClaw — orchestrateur SDK pour opencode sans iframe. Liste de projets + TUI par projet via @opencode-ai/sdk. Interface sur mesure au dessus d'opencode.

**Product:** Sidebar projets cliquables → espace projet dédié. Zone TUI gauche: prompt + streaming + clear/autoscroll. Zone info droite: header projet + stats + historique exécutions.

**Far vision:** Remplacer complètement l'UI opencode par une interface sur mesure. Support multi-agents avec priorisation intelligente. Intégration native des skills et workflows.

## Sprints

### Sprint 1 — MVP complet ✅
- S1-01 Init Node/TS + Express ✅
- S1-02 Route "/" + css-base ✅
- S1-03 API /api/projects + UI dashboard ✅
- S1-04 Execution queue runner ✅
- S1-05 Dashboard résultats + historique ✅

### Sprint 2 — SDK integration ✅ TESTED
- S2-01 Install @opencode-ai/sdk + proxy routes ✅
- S2-02 UI layout projet (2 colonnes TUI + info) ✅
- S2-03 TUI zone — prompt input + streaming SSE ✅

### Sprint 3 — Zone info + TUI polish ✅ TESTED
- S3-01 Zone info — header projet (nom, path, statut) ✅
- S3-02 Zone info — stats exécutions (today, success rate) ✅
- S3-03 Zone info — historique récent (5 dernières) ✅
- S3-04 TUI — dot connexion opencode ✅
- S3-05 TUI — clear button + auto-scroll toggle ✅

**Test result (Playwright):** Info zone complète visible, stats chargées, dot connexion vert, boutons clear/autoscroll dans le header TUI.

## Next

**Action:** Sprint 3 terminé — planifier Sprint 4  
**Command:** `bmad-sprint`  
**Role:** Scrum Master
