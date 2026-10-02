import type { Smoke } from "./vehicle";

export type Severity = 1 | 2 | 3 | 4;

export const SEVERITY_LABEL: Record<Severity, string> = { 1: "Faible", 2: "Moyenne", 3: "Élevée", 4: "Critique" };

export interface FailureScene {
  /** Oriente la caméra côté échappement. */
  view?: 'exhaust';
  /** Pièces ajoutées au cadrage sans être surlignées (par exemple la sortie de la ligne pour voir la fumée). */
  frame?: string[];
  xray?: boolean;
  cut?: boolean;
  gas?: boolean;
  play?: boolean;
  /** Éclaté de 0 à 1. */
  ex?: number;
}

export interface Failure {
  id: string;
  name: string;
  sev: Severity;
  short: string;
  /** Pièces touchées, surlignées en rouge. */
  parts: string[];
  /** Réglages de vue appliqués à l'ouverture de la panne. */
  scene: FailureScene;
  /** Fumée visible en sortie d'échappement. */
  smoke?: Smoke;
  symptoms: string[];
  causes: string[];
  diag: string[];
  fix: string;
  drive: string;
}

export const FAILS: Failure[] = [
 { id:'joint', name:'Joint de culasse claqué', sev:4,
   short:'Fumée blanche, liquide de refroidissement qui baisse, huile laiteuse.',
   parts:['joint','culasse','bloc'], scene:{ xray:true, play:true, frame:['catalyseur'] }, smoke:'white',
   symptoms:['Fumée blanche épaisse et sucrée à l\'échappement','Niveau de liquide de refroidissement qui baisse sans fuite visible','Huile couleur café au lait sous le bouchon de remplissage','Bulles dans le vase d\'expansion moteur tournant, surchauffe'],
   causes:['Surchauffe prolongée qui déforme la culasse','Serrage de culasse ou joint monté sans respect du couple','Âge et kilométrage, joint fatigué'],
   diag:['Contrôler la couleur de l\'huile et du liquide','Test de fumées de combustion dans le liquide de refroidissement','Mesurer la compression cylindre par cylindre','Contrôler la planéité de la culasse à la règle'],
   fix:'Dépose de la culasse, rectification si elle est voilée, joint et vis neufs, vidange complète.',
   drive:'Arrêt immédiat. Rouler avec ce défaut peut fissurer la culasse ou noyer un cylindre.' },
 { id:'courroie', name:'Courroie de distribution cassée', sev:4,
   short:'Arrêt net du moteur, plus aucune compression, souvent avec soupapes tordues.',
   parts:['courroie','sou_adm','sou_ech','piston','arb_adm','arb_ech'], scene:{ ex:0.2 },
   symptoms:['Moteur qui s\'arrête brutalement en roulant','Le démarreur tourne à vide, sans résistance','Parfois un claquement métallique juste avant l\'arrêt','Bruit de roulement ou sifflement avant la rupture'],
   causes:['Intervalle de remplacement dépassé (kilométrage ou âge)','Galet tendeur ou pompe à eau grippés','Fuite d\'huile sur la courroie qui la ramollit'],
   diag:['Faire tourner le moteur à la main et constater l\'absence de résistance','Ouvrir le carter de distribution et contrôler la courroie','Test de compression pour mesurer les dégâts sur les soupapes'],
   fix:'Remplacer le kit complet (courroie, galets, tendeur, souvent la pompe à eau). Si les soupapes ont touché les pistons : culasse à reprendre.',
   drive:'Impossible. Sur un moteur à interférence, la rupture provoque la rencontre des soupapes et des pistons.' },
 { id:'allumage', name:'Ratés d\'allumage', sev:2,
   short:'Moteur qui broute, voyant moteur clignotant, perte de puissance.',
   parts:['bougie','bobine'], scene:{ gas:true, play:true },
   symptoms:['Vibrations et à-coups au ralenti ou en charge','Voyant moteur qui clignote sous accélération','Surconsommation, odeur d\'essence non brûlée','Démarrage difficile par temps humide'],
   causes:['Bougie usée ou encrassée, écartement trop grand','Bobine d\'allumage défaillante (souvent une seule)','Faisceau ou connecteur oxydé'],
   diag:['Lire les codes défaut : P0301 à P0304 désignent le cylindre fautif','Permuter les bobines entre deux cylindres et voir si le défaut suit','Contrôler l\'aspect et l\'écartement des bougies'],
   fix:'Remplacer les bougies par jeu complet, puis la bobine du cylindre concerné.',
   drive:'À éviter. Le carburant non brûlé endommage le catalyseur en quelques centaines de kilomètres.' },
 { id:'segments', name:'Consommation d\'huile et segments usés', sev:3,
   short:'Fumée bleutée, niveau d\'huile qui baisse, bougies grasses.',
   parts:['segments','piston','bloc'], scene:{ cut:true, gas:true, play:true, frame:['catalyseur'] }, smoke:'blue',
   symptoms:['Fumée bleutée surtout au démarrage ou en décélération','Plus d\'un litre d\'huile consommé aux 1000 km','Bougies noires et grasses','Compression faible sur un ou plusieurs cylindres'],
   causes:['Segments collés par la calamine ou usés','Paroi du cylindre rayée ou ovalisée','Joints de queue de soupape durcis (fumée au démarrage seulement)','Entretien espacé, huile inadaptée'],
   diag:['Test de compression sec puis humide : si l\'huile améliore la valeur, ce sont les segments','Contrôler le niveau d\'huile à intervalle régulier','Endoscopie des cylindres'],
   fix:'Décalaminage en traitement léger, sinon rénovation du bas moteur : segments, alésage, parfois pistons.',
   drive:'Possible un temps en surveillant le niveau. Un niveau trop bas détruit le moteur.' },
 { id:'refroid', name:'Pompe à eau défaillante et surchauffe', sev:3,
   short:'Température qui monte, fuite de liquide, grincement à l\'avant du moteur.',
   parts:['pompe_eau','courroie_acc','joint'], scene:{ ex:0.15 },
   symptoms:['Aiguille de température dans le rouge, voyant d\'alerte','Traces de liquide sous la pompe','Grincement ou roulement bruyant à l\'avant','Chauffage qui ne souffle plus chaud'],
   causes:['Roulement ou garniture de pompe usés','Roue d\'entraînement dégradée','Thermostat bloqué fermé ou radiateur obstrué','Courroie qui patine'],
   diag:['Chercher une fuite au trou témoin de la pompe','Vérifier le jeu de l\'axe de poulie à la main','Contrôler le thermostat et la circulation du liquide'],
   fix:'Remplacer la pompe, souvent avec la courroie de distribution, puis purger le circuit.',
   drive:'Arrêt dès que l\'alerte s\'allume. Une surchauffe répétée entraîne un joint de culasse claqué.' },
 { id:'huile', name:'Pression d\'huile faible', sev:4,
   short:'Voyant d\'huile, cognement dans le bas moteur, bruit à chaud.',
   parts:['pompe_huile','vilo','bielle','filtre','carter'], scene:{ xray:true },
   symptoms:['Voyant de pression d\'huile allumé, surtout à chaud au ralenti','Cognement sourd dans le bas moteur, qui monte avec le régime','Moteur bruyant après une vidange tardive','Limaille brillante dans l\'huile'],
   causes:['Niveau d\'huile trop bas ou huile trop fluide','Filtre colmaté, crépine obstruée','Coussinets de bielle ou de paliers usés (jeu trop grand)','Pompe usée ou soupape de décharge coincée'],
   diag:['Contrôler le niveau, puis la couleur et la viscosité','Brancher un manomètre à la place du capteur de pression','Examiner l\'huile vidangée et le filtre à la recherche de particules métalliques'],
   fix:'Remplacer huile, filtre et capteur si le manomètre est bon. Sinon coussinets, voire vilebrequin à rectifier.',
   drive:'Arrêt immédiat. Quelques minutes sans pression suffisent pour faire tourner une bielle.' },
 { id:'injecteurs', name:'Injecteurs encrassés', sev:2,
   short:'Ralenti instable, trous à l\'accélération, consommation en hausse.',
   parts:['injecteur'], scene:{ ex:0.1 },
   symptoms:['Ralenti irrégulier, calages à froid','Hésitation à l\'accélération','Consommation et émissions en hausse','Cylindre qui rate de façon intermittente'],
   causes:['Dépôts de gomme dans le gicleur','Carburant de mauvaise qualité','Trajets courts répétés','Joint torique poreux qui fait entrer de l\'air'],
   diag:['Écouter chaque injecteur au stéthoscope : un clic régulier est attendu','Mesurer la résistance de la bobine de chaque injecteur','Test de débit et de pulvérisation au banc'],
   fix:'Nettoyage ultrasons ou au banc, ou remplacement. Un traitement dans le réservoir est préventif, pas curatif.',
   drive:'Possible. À corriger rapidement pour ne pas fatiguer le catalyseur.' },
 { id:'soupape', name:'Soupape brûlée ou perte de compression', sev:3,
   short:'Un cylindre qui ne tient plus la compression, ratés, perte de puissance.',
   parts:['sou_adm','sou_ech','ressort','culasse','arb_ech'], scene:{ cut:true, gas:true, play:true },
   symptoms:['Rate régulier sur un cylindre qui ne disparaît pas avec les bougies','Perte de puissance, ralenti irrégulier','Compression basse sur un seul cylindre','Claquements de soupapes dans la culasse'],
   causes:['Siège de soupape usé ou mélange trop pauvre qui surchauffe la soupape','Jeu aux soupapes trop serré, la soupape ne se plaque plus','Ressort cassé ou fatigué','Sur un moteur au GPL, sièges non adaptés'],
   diag:['Test de compression cylindre par cylindre','Test d\'étanchéité par air comprimé (taux de fuite) pour localiser la fuite','Endoscopie de la chambre','Contrôle du jeu aux soupapes quand il est réglable'],
   fix:'Dépose de la culasse, rodage ou remplacement de la soupape et du siège, ressort neuf si besoin.',
   drive:'À éviter. Le moteur peut continuer mais la perte de compression s\'aggrave et fragilise le catalyseur.' },
 { id:'admission', name:'Fuite d\'air à l\'admission', sev:2,
   short:'Ralenti trop haut ou qui oscille, mélange pauvre, sifflement.',
   parts:['admission','papillon','injecteur'], scene:{ ex:0.1 },
   symptoms:['Ralenti qui accroche ou qui oscille','Sifflement à l\'ouverture du capot','Code défaut de mélange pauvre','Calages à l\'arrêt'],
   causes:['Durite d\'admission fendue ou débranchée','Joint de collecteur durci','Boîtier papillon encrassé par les vapeurs d\'huile','Reniflard de carter bouché'],
   diag:['Inspecter les durites et les raccords','Pulvériser du nettoyant frein autour des joints moteur tournant : le régime qui monte désigne la fuite','Nettoyer le boîtier papillon et refaire son apprentissage'],
   fix:'Remplacer la durite ou le joint concerné, nettoyer le papillon avec un produit adapté.',
   drive:'Possible, avec consommation accrue et risque de calage.' },
 { id:'alternateur', name:'Alternateur ou courroie d\'accessoires', sev:2,
   short:'Voyant batterie, sifflement au démarrage, batterie qui se vide.',
   parts:['alternateur','courroie_acc','poulie'], scene:{ ex:0.15 },
   symptoms:['Voyant de batterie allumé en roulant','Sifflement ou grincement au démarrage et à fort appel de courant','Tension inférieure à 13 V moteur tournant','Phares qui faiblissent au ralenti'],
   causes:['Courroie détendue, vitrifiée ou fissurée','Galet tendeur usé','Régulateur ou charbons d\'alternateur usés','Roulement d\'alternateur bruyant'],
   diag:['Mesurer la tension à la batterie : environ 14 V moteur tournant','Inspecter la courroie (fissures, brillance)','Contrôler le galet tendeur et l\'alignement des poulies'],
   fix:'Remplacer la courroie et le galet, puis le régulateur ou l\'alternateur si la tension reste basse.',
   drive:'Quelques kilomètres seulement : sur la batterie seule, le moteur s\'arrête vite. Si la même courroie entraîne la pompe à eau, arrêt immédiat.' },
 { id:'huile_cache', name:'Fuite d\'huile au cache-culbuteurs', sev:1,
   short:'Odeur d\'huile chaude, huile dans les puits de bougies.',
   parts:['cache','bougie','culasse'], scene:{ ex:0.3 },
   symptoms:['Odeur d\'huile brûlée à l\'arrêt','Traces d\'huile sur le haut du moteur','Huile au fond des puits de bougies','Ratés d\'allumage sur un ou plusieurs cylindres'],
   causes:['Joint de cache-culbuteurs durci par la chaleur','Joints de puits de bougies fatigués','Vis de fixation desserrées'],
   diag:['Nettoyer le moteur puis chercher l\'origine de la trace','Retirer une bobine et regarder si le puits est noyé d\'huile'],
   fix:'Remplacer le joint de cache-culbuteurs et les joints de puits de bougies, nettoyer les bobines.',
   drive:'Possible, avec contrôle du niveau d\'huile. À traiter avant que l\'huile ne détruise les bobines.' },
 { id:'catalyseur', name:'Catalyseur colmaté ou fondu', sev:3,
   short:'Perte de puissance qui s\'aggrave, odeur d\'œuf pourri, bruit de cailloux sous la voiture.',
   parts:['catalyseur','sonde_lambda','echappement'], scene:{ gas:true, play:true, view:'exhaust' },
   symptoms:['Perte de puissance progressive, surtout en montée et à haut régime','Odeur d\'œuf pourri (soufre) à l\'échappement','Bruit de cailloux qui roulent sous le véhicule : le monolithe est cassé','Voyant moteur, code P0420 : efficacité du catalyseur insuffisante','Catalyseur anormalement chaud, parfois rouge sombre après un trajet'],
   causes:['Ratés d\'allumage prolongés : le carburant imbrûlé brûle dans le catalyseur et le fait fondre','Consommation d\'huile qui encrasse le monolithe','Mélange trop riche pendant longtemps (sonde lambda, injecteur)','Choc thermique ou mécanique, vieillissement'],
   diag:['Lire les codes défaut et comparer les signaux des deux sondes lambda','Mesurer la contre-pression à l\'échappement','Comparer au thermomètre infrarouge la température en entrée et en sortie du catalyseur','Taper légèrement l\'enveloppe pour entendre un monolithe cassé'],
   fix:'Traiter d\'abord la cause (ratés, huile, mélange), puis remplacer le catalyseur. Un catalyseur neuf détruit par la même cause ne tient que quelques milliers de kilomètres.',
   drive:'À limiter. Bouché, le catalyseur étouffe le moteur et le fait chauffer. Fondu, il peut l\'empêcher de démarrer.' },
 { id:'riche', name:'Mélange trop riche', sev:2,
   short:'Fumée noire, odeur d\'essence, consommation en forte hausse.',
   parts:['sonde_lambda','injecteur','catalyseur'], scene:{ gas:true, play:true, view:'exhaust' }, smoke:'black',
   symptoms:['Fumée noire à l\'accélération','Forte odeur d\'essence à l\'échappement','Consommation en nette hausse','Bougies noires et sèches, couvertes de suie','Ralenti irrégulier, voyant moteur'],
   causes:['Sonde lambda amont paresseuse ou hors service : le calculateur enrichit à l\'aveugle','Injecteur qui fuit ou reste ouvert','Pression d\'essence trop élevée (régulateur)','Capteur de température qui indique un moteur froid en permanence'],
   diag:['Lire les corrections de richesse : très négatives, elles montrent que le calculateur tente d\'appauvrir','Observer le signal de la sonde amont : il doit osciller rapidement autour de 0,45 V','Contrôler la pression d\'essence et l\'étanchéité des injecteurs','Vérifier la valeur lue par le capteur de température'],
   fix:'Remplacer la sonde ou l\'injecteur en cause, puis contrôler l\'état du catalyseur.',
   drive:'Possible sur une courte distance. Prolongé, l\'excès d\'essence surchauffe et détruit le catalyseur.' }
];

export const FAIL: Record<string, Failure> = Object.fromEntries(FAILS.map((f) => [f.id, f]));
