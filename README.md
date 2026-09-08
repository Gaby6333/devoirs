# Intégration Nocturne dans `devoirs/`

Les trois fichiers de ce dossier sont prêts à remplacer les vôtres :

```
devoirs-integration/index.html  →  devoirs/index.html
devoirs-integration/style.css   →  devoirs/style.css
devoirs-integration/app.js      →  devoirs/app.js
```

Rien d'autre à toucher : `manifest.json`, `sw.js`, les icônes et la config
Firebase restent tels quels. Faites un commit avant, pour pouvoir revenir en
arrière.

## Ce qui a changé

**style.css** — réécrit. Mêmes noms de classes qu'avant, donc le JS continue
de fonctionner ; seuls les tokens changent. Fond sombre Nocturne, Inter,
rayons de 8 px, un seul accent. Le thème clair est fourni aussi
(`[data-theme="light"]` + `prefers-color-scheme`), votre bouton de thème
marche toujours. La couleur de matière passe de pastille pleine à un point
de 6 px (`.subject-tag::before`) plus une marque de 2 px sur le bord de la
carte ; rouge et ambre sont réservés au retard et à l'urgence.

**index.html** — Fraunces / Work Sans remplacés par Inter + Phosphor, les
emoji du sélecteur de type remplacés par des icônes, `theme-color` mis à
`#161826`, le `+` du bouton flottant devient « Ajouter », en-tête allégé.

**app.js** — six remplacements seulement, aucun changement de logique :
`TYPES` porte des noms de classes Phosphor au lieu d'emoji, `type-tag`
et les états vides passent en `innerHTML`, `THEME_ICONS` idem, et les
confettis deviennent des points d'accent au lieu de 🎉.

## Ce qui n'est pas fait

Ces fichiers restaurent l'apparence de la maquette, pas sa structure. Il
manque encore, parce que ça demande de nouveaux écrans :

- le panneau d'ajout reste inline en haut de la liste, pas une feuille
  modale glissante (`1e`) ;
- pas d'écran de détail, tout reste dans la carte (`1d`) ;
- pas de vue semaine ni de vue par matière (`1f`, `1g`).

Dites-moi si vous voulez que j'en fasse un.
