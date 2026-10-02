# Anatomie moteur

Visualiseur 3D d'un moteur 4 cylindres en ligne, 16 soupapes : pièces, pannes classiques, cycle à quatre temps avec gaz et pressions, échappement jusqu'au catalyseur, véhicule simulé. Interface minimaliste dans l'esprit Apple, construite sur un design system documenté dans Storybook.

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

## Gaz et échappement

Les particules de gaz changent de teinte selon leur composition (mélange frais, combustion, gaz brûlés) ; leur taille et leur éclat suivent la pression. Soupape d'échappement ouverte, elles quittent le cylindre avec un débit qui dépend de la levée, de la pression restante (la bouffée) et de la remontée du piston (le refoulement), puis suivent le trajet tubulure, descente, catalyseur, sortie. Le collecteur et le catalyseur passent en verre quand les gaz sont affichés, et chaque bouffée réchauffe la tubulure de son cylindre.

L'onglet Cycle de l'inspecteur montre l'épure de distribution, les levées et la pression relevée en direct, le calage et la chaleur des tubulures. Le bouton orbite de la barre d'outils tourne la vue côté échappement. Trois pannes produisent une fumée en sortie : blanche (joint de culasse), bleutée (segments), noire (mélange trop riche).

## Design system

Tokens à deux niveaux : primitives `--p-*` jamais utilisées directement, puis tokens sémantiques `--color-*`, `--space-*`, `--radius-*`, `--text-*`, seuls consommés par les composants et redéfinis pour le thème sombre. Le thème suit le système et se force avec `data-theme` sur `<html>`.

Composants : Text, Icon, Button, IconButton, Tooltip, SegmentedControl, Slider, SearchField, Badge, Surface, ListItem, SectionHeader, Readout, Meter, Toolbar. Import via l'alias `@ds`.
