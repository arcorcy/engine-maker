# Anatomie moteur

Visualiseur 3D d'un moteur 4 cylindres en ligne, 16 soupapes : pièces, pannes classiques, cycle à quatre temps avec gaz et pressions, échappement jusqu'au catalyseur, véhicule simulé. Interface minimaliste dans l'esprit Apple, construite sur un design system documenté dans Storybook.

## Démarrer

```bash
npm install
npm run dev          # application, http://localhost:5173
npm run storybook    # design system, http://localhost:6006
npm run build        # vérification des types et build de production
npm test             # tests du cœur des moteurs personnalisés
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
    spec/               moteurs personnalisés : catalogue, valeurs dérivées, règles de cohérence, schéma
    scene/              Three.js : modèle procédural, cinématique, gaz, scène et caméra
  app/
    state/store.ts      état global (zustand), lu à chaque image par la scène
    components/         barre du haut, bibliothèque, inspecteur, barre d'outils, HUD
```

La scène 3D est impérative : React ne la re-rend jamais. Elle lit l'état du store à chaque image et publie la télémétrie (angle, temps, pressions) environ dix fois par seconde dans un second store.

## Gaz et échappement

Les particules de gaz changent de teinte selon leur composition (mélange frais, combustion, gaz brûlés) ; leur taille et leur éclat suivent la pression. Soupape d'échappement ouverte, elles quittent le cylindre avec un débit qui dépend de la levée, de la pression restante (la bouffée) et de la remontée du piston (le refoulement), puis suivent le trajet tubulure, descente, catalyseur, sortie. Le collecteur et le catalyseur passent en verre quand les gaz sont affichés, et chaque bouffée réchauffe la tubulure de son cylindre.

L'onglet Cycle de l'inspecteur montre l'épure de distribution, les levées et la pression relevée en direct, le calage et la chaleur des tubulures. Le bouton orbite de la barre d'outils tourne la vue côté échappement. Trois pannes produisent une fumée en sortie : blanche (joint de culasse), bleutée (segments), noire (mélange trop riche).

## Parcours

1. **Accueil, « Mes moteurs »** (`#/`) : le tableau de bord des moteurs créés, avec cylindrée, cotes, rapport volumétrique, état de cohérence et date de modification. On y duplique et supprime les moteurs.
2. **Nouveau moteur** : on choisit l'architecture (3, 4, 5 ou 6 cylindres en ligne, V6, V8, V10, V12 ou V16), le moteur est créé avec ses pièces d'origine et s'ouvre directement en 3D (`#/moteurs/<id>`).
3. **Remplacer une pièce depuis la vue** : un clic sur une pièce, dans la maquette ou dans la liste, ouvre sa fiche. Elle montre la pièce montée et les remplacements possibles, chacun avec ses conséquences (pièces qui seront adaptées, variantes incompatibles grisées avec leur raison). La maquette se reconstruit avec les nouvelles cotes. L'onglet Moteur donne la fiche technique, le diagnostic, les réglages et la liste des pièces changées. ⌘Z annule.

Le moteur de référence se consulte en lecture seule (`#/reference`). Les moteurs sont enregistrés automatiquement dans le navigateur (`LocalEngineRepository`) ; l'interface `EngineRepository` de `src/app/garage/repository.ts` est le point de branchement de Supabase.

## Architectures

Chaque modèle de départ (`src/engine/spec/catalog.ts`) part de cotes réelles (alésage, course, bielle, entraxe, rapport volumétrique visé, profil de came, régime). Sa famille de pièces est générée avec la même logique que celle du 1.6 : bloc réalésé, vilebrequins court et long, bielles courtes et longues, pistons haute compression, turbo, à axe remonté et cote réparation, joint épais, culasses rectifiée et préparée, cames sport et course, ressorts renforcés. Les pièces d'une architecture ne se montent que sur elle. Les tests vérifient que chaque modèle est cohérent d'origine et que les mêmes règles s'y appliquent.

## Maquette paramétrique

`src/engine/scene/geometry.ts` convertit la spec en géométrie de maquette : disposition (un banc vertical, ou deux bancs inclinés de ± la moitié de l'angle du V, le banc A dessiné en miroir pour garder l'admission dans le V), position des cylindres, alésage, course, longueur de bielle, hauteur de compression du piston, plan de joint, profils de came, ordre d'allumage, avance. En V, chaque cylindre a son maneton, et chaque banc a sa coupe, sa ligne d'échappement et son catalyseur. Le modèle, la cinématique et les gaz ne contiennent plus de cote moteur ; la scène se reconstruit quand la spec change. La simulation des gaz reproduit le rapport volumétrique calculé.

## Moteurs personnalisés : le cœur

`src/engine/spec` décrit un moteur par une spec minimale : un modèle de départ, la variante choisie pour chaque emplacement de pièce, et trois réglages (régime maxi, avance à l'allumage, ordre d'allumage). Tout le reste est dérivé et jamais stocké : cylindrée, rapport volumétrique, calage, jeu soupape-piston, vitesse du piston. Chaque grandeur a un seul propriétaire (l'alésage au bloc, la course au vilebrequin, la longueur à la bielle, le calage aux arbres à cames).

- `derive(spec)` calcule la géométrie avec les mêmes fonctions de cinématique que la maquette 3D.
- `validate(spec)` renvoie des erreurs (bloquantes) et des avertissements, avec la pièce en cause et une piste de correction.
- `applyChange(spec, change)` applique un choix et remplace automatiquement les pièces qui doivent s'appairer (pistons, segments et joint après un réalésage), en listant ce qui a changé. Les contraintes de réglage ne sont jamais corrigées en silence.
- `optionsFor(spec, slot)` annote chaque variante : montable telle quelle, avec remplacements, ou bloquée.
- `parseSpec(json)` vérifie une spec venue de l'extérieur (Supabase, fichier) avec zod.

## Design system

Tokens à deux niveaux : primitives `--p-*` jamais utilisées directement, puis tokens sémantiques `--color-*`, `--space-*`, `--radius-*`, `--text-*`, seuls consommés par les composants et redéfinis pour le thème sombre. Le thème suit le système et se force avec `data-theme` sur `<html>`.

Composants : Text, Icon, Button, IconButton, Tooltip, SegmentedControl, Slider, NumberField, TextField, SearchField, ChoiceList, Badge, Notice, Dialog, Surface, ListItem, SectionHeader, Readout, Meter, Toolbar. Import via l'alias `@ds`.
