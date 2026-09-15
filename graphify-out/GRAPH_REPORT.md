# Graph Report - devoirs  (2026-09-14)

## Corpus Check
- Corpus is ~7,649 words - fits in a single context window. You may not need a graph.

## Summary
- 98 nodes · 248 edges · 18 communities (13 shown, 4 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.86)
- Token cost: 0 input · 241,852 output

## Community Hubs (Navigation)
- Core UI Rendering
- Subject & Course Management
- Reminders & Week View
- App Shell & Firebase Setup
- App State & Navigation
- Integration Guide & Screens
- PWA Manifest
- Form Save & Toast Feedback
- Date Formatting & Detail View
- Assignment CRUD
- URL Routing
- Service Worker Caching
- Nocturne Theme Styling
- PWA Icon Assets
- Apple Touch Icon
- Favicon
- Large PWA Icon

## God Nodes (most connected - your core abstractions)
1. `renderDetail()` - 20 edges
2. `renderCourses()` - 14 edges
3. `render()` - 14 edges
4. `h()` - 13 edges
5. `index.html (App Shell — Devoirs à deux)` - 12 edges
6. `icon()` - 11 edges
7. `renderWeek()` - 11 edges
8. `renderSettings()` - 11 edges
9. `Intégration — remplacer et commit (README)` - 11 edges
10. `subjectColor()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `devoirs-integration/index.html (source file)` --references--> `index.html (App Shell — Devoirs à deux)`  [EXTRACTED]
  README.md → index.html
- `Écran Détail` --conceptually_related_to--> `Composant Toast (avec Annuler)`  [INFERRED]
  README.md → index.html
- `Écran Réglages` --conceptually_related_to--> `Overlay de sélection d'identité (Léonie / Gabriel)`  [INFERRED]
  README.md → index.html
- `devoirs-integration/style.css (source file)` --references--> `style.css`  [EXTRACTED]
  README.md → index.html
- `style.css` --implements--> `Tokens de thème Nocturne (style.css)`  [EXTRACTED]
  index.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Cinq écrans de l'application Devoirs à deux** — readme_screen_liste, readme_screen_ajouter_modifier, readme_screen_detail, readme_screen_semaine, readme_screen_reglages [EXTRACTED 1.00]
- **Couche données/auth Firebase (compat SDK + schéma Firestore)** — index_firebase_app_compat, index_firebase_firestore_compat, index_firebase_auth_compat, readme_firestore_schema [INFERRED 0.85]

## Communities (18 total, 4 thin omitted)

### Community 0 - "Core UI Rendering"
Cohesion: 0.40
Nodes (14): card(), go(), h(), icon(), initials(), isMine(), openForm(), render() (+6 more)

### Community 1 - "Subject & Course Management"
Cohesion: 0.35
Nodes (11): addCourse(), allSubjects(), courseByName(), cycleCourseColor(), hasDuplicateSubjects(), mergeDuplicateSubjects(), renameCourse(), renderCourses() (+3 more)

### Community 2 - "Reminders & Week View"
Cohesion: 0.29
Nodes (11): checkReminders(), dueInfo(), exportData(), iso(), notifiedMap(), renderWeek(), shiftDays(), startOfWeek() (+3 more)

### Community 3 - "App Shell & Firebase Setup"
Cohesion: 0.22
Nodes (9): firebase-app-compat.js (CDN), firebase-auth-compat.js (CDN), firebase-firestore-compat.js (CDN), Google Fonts — Inter, Overlay de sélection d'identité (Léonie / Gabriel), index.html (App Shell — Devoirs à deux), Phosphor Icons (CDN), devoirs-integration/index.html (source file) (+1 more)

### Community 4 - "App State & Navigation"
Cohesion: 0.29
Nodes (6): applyTheme(), downloadIcs(), escapeIcs(), visibleItems(), Architecture à cinq écrans, Navigation par history.pushState

### Community 5 - "Integration Guide & Screens"
Cohesion: 0.25
Nodes (8): Composant Toast (avec Annuler), devoirs-integration/app.js (source file), Firestore Schema (collections devoirs/cours), Intégration — remplacer et commit (README), Écran Ajouter / Modifier, Écran Détail, Écran Liste, Écran Semaine

### Community 6 - "PWA Manifest"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 7 - "Form Save & Toast Feedback"
Cohesion: 0.33
Nodes (7): deleteCourse(), hideToast(), payloadOf(), saveForm(), setStatus(), toast(), updateDevoir()

### Community 8 - "Date Formatting & Detail View"
Cohesion: 0.67
Nodes (4): longDate(), parseDate(), relativeTime(), renderDetail()

### Community 9 - "Assignment CRUD"
Cohesion: 0.67
Nodes (3): addDevoir(), deleteDevoir(), showBanner()

### Community 10 - "URL Routing"
Cohesion: 1.00
Nodes (3): back(), readUrl(), urlFor()

### Community 11 - "Service Worker Caching"
Cohesion: 0.67
Nodes (3): Enregistrement du Service Worker (inline script), Versionnage du cache Service Worker, sw.js (Service Worker)

### Community 12 - "Nocturne Theme Styling"
Cohesion: 0.67
Nodes (3): devoirs-integration/style.css (source file), Tokens de thème Nocturne (style.css), style.css

## Knowledge Gaps
- **18 isolated node(s):** `name`, `short_name`, `start_url`, `display`, `background_color` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 23 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `index.html (App Shell — Devoirs à deux)` connect `App Shell & Firebase Setup` to `App State & Navigation`, `Integration Guide & Screens`, `PWA Manifest`, `Service Worker Caching`, `Nocturne Theme Styling`?**
  _High betweenness centrality (0.287) - this node is a cross-community bridge._
- **Why does `Intégration — remplacer et commit (README)` connect `Integration Guide & Screens` to `Service Worker Caching`, `App Shell & Firebase Setup`, `Nocturne Theme Styling`, `PWA Manifest`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `style.css` connect `Nocturne Theme Styling` to `App Shell & Firebase Setup`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `name`, `short_name`, `start_url` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._