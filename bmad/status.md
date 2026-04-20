# Status — opencode-claw

**Generated:** 2026-04-20 | **Phase:** in-progress | **Progress:** 60%  
**Active role:** Developer

## Dimensions

**Marketing:** CodeClaw — orchestrateur SDK pour opencode sans iframe. Liste de projets + TUI par projet via @opencode-ai/sdk. Interface sur mesure au dessus d'opencode.

**Product:** Sidebar projets cliquables → espace projet dédié. Zone TUI gauche: prompt + streaming via SDK (opérationnel). Zone info droite: placeholder Sprint 3.

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
- S2-03 TUI zone — prompt input + streaming SSE ✅ (Playwright validated)

**Test result:** App charge, sidebar projets, clic → 2 colonnes, TUI visible, erreur connexion opencode affichée correctement quand opencode non démarré.

## Next

**Action:** Sprint 2 validé — démarrer Sprint 3 (zone info + améliorations TUI)  
**Command:** `bmad-sprint`  
**Role:** Scrum Master
