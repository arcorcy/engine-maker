# Anatomie moteur

Visualiseur 3D d'un moteur 4 cylindres en ligne, 16 soupapes : pièces, pannes classiques, cycle à quatre temps avec gaz et pressions, véhicule simulé. Interface minimaliste dans l'esprit Apple, construite sur un design system documenté dans Storybook.

## Démarrer

```bash
npm install
npm run dev          # application, http://localhost:5173
npm run storybook    # design system, http://localhost:6006
npm run build        # vérification des types et build de production
```

## Organisation

```
src/
  design-system/        Design system, indépendant de l'application
    tokens/             tokens.css (primitives + sémantiques, clair et sombre), base.css, miroir TS
    components/         un dossier par composant : .tsx, .module.css, .stories.tsx
    foundations/        pages MDX Storybook : couleurs, typographie, espacements, mouvement
  engine/
    data/               pièces, pannes, systèmes, véhicule
    scene/              Three.js : modèle procédural, cinématique, gaz, scène et caméra
  app/
    state/store.ts      état global (zustand), lu à chaque image par la scène
    components/         barre du haut, bibliothèque, inspecteur, barre d'outils, HUD
```

La scène 3D est impérative : React ne la re-rend jamais. Elle lit l'état du store à chaque image et publie la télémétrie (angle, temps, pressions) environ dix fois par seconde dans un second store.

## Design system

Tokens à deux niveaux : primitives `--p-*` jamais utilisées directement, puis tokens sémantiques `--color-*`, `--space-*`, `--radius-*`, `--text-*`, seuls consommés par les composants et redéfinis pour le thème sombre. Le thème suit le système et se force avec `data-theme` sur `<html>`.

Composants : Text, Icon, Button, IconButton, Tooltip, SegmentedControl, Slider, SearchField, Badge, Surface, ListItem, SectionHeader, Readout, Meter, Toolbar. Import via l'alias `@ds`.
