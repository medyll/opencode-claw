# Sprint 5 — Multi-agent support + polish final

**Goal:** Support multi-agents avec priorisation intelligente + polish UX final

## Stories:

| ID | Title | Effort |
|----|-------|--------|
| S5-01 | Multi-session UI — afficher plusieurs sessions actives par projet | M |
| S5-02 | Session switcher — basculer entre sessions dans la TUI | S |
| S5-03 | Agent priority queue — prioriser les sessions par urgence | L |
| S5-04 | Skills panel — liste des skills disponibles dans info zone | M |
| S5-05 | Dark/Light theme toggle — switch de thème utilisateur | S |
| S5-06 | Export execution logs — télécharger logs en .txt | S |

**Total:** 6 stories (3S, 2M, 1L)

**Dependencies:**
- S5-01 → S5-02 (session switcher nécessite multi-session UI)
- S5-03 indépendant (backend logic)
- S5-04, S5-05, S5-06 indépendants

**Capacity:** ~2-3 jours de dev

**Notes:**
- S5-03 (priority queue) est la story principale pour la far_vision "support multi-agents avec priorisation intelligente"
- S5-04 prépare l'intégration "skills et workflows ferule"
