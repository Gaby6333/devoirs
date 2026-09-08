# Intégration — remplacer et commit

Les trois fichiers de ce dossier remplacent les vôtres :

```
devoirs-integration/index.html  →  devoirs/index.html
devoirs-integration/style.css   →  devoirs/style.css
devoirs-integration/app.js      →  devoirs/app.js
```

`manifest.json`, `sw.js`, les icônes et la config Firebase sont inchangés — la
config Firestore est reprise telle quelle dans le nouveau `app.js`, mêmes
collections (`devoirs`, `cours`) et mêmes champs (`title`, `type`, `subject`,
`dueDate`, `weight`, `duration`, `description`, `assignedTo`, `status`,
`createdAt/By`, `updatedAt/By`). Vos données existantes s'affichent sans
migration.

Faites un commit avant, pour pouvoir revenir en arrière.

## Ce qui change

`app.js` est réécrit autour de cinq écrans séparés au lieu d'une seule page :

- **Liste** — en-tête compact, filtres, recherche, tri, regroupement en retard
  / cette semaine / plus tard, terminés repliés.
- **Ajouter / Modifier** — écran plein avec sa propre barre (Annuler ·
  Enregistrer), plus le panneau inline. « Enregistrer » est désactivé tant
  qu'il n'y a pas de titre.
- **Détail** — un devoir en entier : remise, pondération, durée, statut,
  description, qui l'a ajouté. Modifier, export `.ics`, supprimer avec
  « Annuler », marquer fini, répéter dans 7 jours.
- **Semaine** — bande des 7 jours avec un point par journée (rouge si en
  retard, couleur de la matière sinon, vert si tout est fini), compteurs de la
  semaine, devoirs groupés par jour, flèches pour changer de semaine.
- **Réglages** — qui je suis, thème clair / sombre / système, afficher les
  terminés.

La navigation passe par `history.pushState`, donc le bouton retour du
téléphone et le geste de retour iOS fonctionnent, et une URL comme
`?v=detail&id=…` s'ouvre directement sur le bon écran.

`style.css` garde les tokens Nocturne de la version précédente et ajoute les
classes des nouveaux écrans. Le thème clair est complet.

## Après le déploiement

`sw.js` met les fichiers en cache. Si vous voyez encore l'ancienne version sur
votre téléphone, changez le numéro de version en haut de `sw.js` (ou fermez et
réouvrez l'app deux fois) pour forcer la mise à jour.
