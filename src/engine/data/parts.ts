import type { SystemId } from "./systems";

export interface Part {
  id: string;
  name: string;
  sys: SystemId;
  qty: number;
  /** Déplacement de la pièce à 100 % d'éclaté (x, y, z), en décimètres. */
  exp: [number, number, number];
  mat: string;
  role: string;
  how: string;
  /** Pannes associées. */
  fails: string[];
}

export const PARTS: Part[] = [
 { id:'bloc', name:'Bloc-cylindres', sys:'str', qty:1, exp:[0,0,0], mat:'Fonte ou alliage d\'aluminium',
   role:'Colonne vertébrale du moteur. Il contient les cylindres où coulissent les pistons et porte le vilebrequin dans son carter inférieur.',
   how:'Les alésages guident les pistons avec un jeu de quelques centièmes de millimètre. Des canaux internes font circuler le liquide de refroidissement et l\'huile sous pression. Tout l\'effort de combustion s\'y encaisse.',
   fails:['joint','segments','refroid'] },
 { id:'joint', name:'Joint de culasse', sys:'str', qty:1, exp:[0,1.4,0], mat:'Multicouche acier ou composite',
   role:'Feuille mince intercalée entre le bloc et la culasse. Il assure l\'étanchéité des gaz, de l\'huile et du liquide de refroidissement.',
   how:'Il suit le contour des cylindres et des canaux. Serré par les vis de culasse selon un ordre et un couple précis, il supporte des pressions de combustion de plus de 60 bars.',
   fails:['joint','refroid'] },
 { id:'culasse', name:'Culasse', sys:'str', qty:1, exp:[0,2.6,0], mat:'Alliage d\'aluminium',
   role:'Ferme le haut des cylindres et forme les chambres de combustion. Elle loge les soupapes, les bougies et les conduits d\'admission et d\'échappement.',
   how:'Les gaz frais entrent par les conduits de la face avant et les gaz brûlés sortent par la face opposée. Des chambres d\'eau et d\'huile la refroidissent et la lubrifient.',
   fails:['joint','soupape','huile_cache'] },
 { id:'cache', name:'Cache-culbuteurs', sys:'str', qty:1, exp:[0,5.9,0], mat:'Aluminium, magnésium ou plastique',
   role:'Couvercle qui protège les arbres à cames et garde l\'huile de distribution à l\'intérieur.',
   how:'Il porte le bouchon de remplissage d\'huile, les puits de bougies et les reniflards qui renvoient les vapeurs de carter vers l\'admission. Un joint le sépare de la culasse.',
   fails:['huile_cache'] },
 { id:'carter', name:'Carter d\'huile', sys:'str', qty:1, exp:[0,-2.4,0], mat:'Tôle emboutie ou aluminium moulé',
   role:'Réservoir d\'huile fixé sous le bloc. Il récupère l\'huile qui retombe du moteur.',
   how:'La crépine de la pompe plonge dans la partie la plus basse. Le bouchon de vidange se trouve au point bas. Un joint ou un mastic assure l\'étanchéité avec le bloc.',
   fails:['huile'] },

 { id:'piston', name:'Pistons', sys:'mob', qty:4, exp:[0,1.1,0], mat:'Alliage d\'aluminium forgé ou moulé',
   role:'Reçoit la poussée des gaz de combustion et la transmet à la bielle. Il aspire, comprime et refoule les gaz dans le cylindre.',
   how:'Le piston monte et descend plusieurs dizaines de fois par seconde. Son axe le relie à la bielle. Sa tête supporte plus de 2000 °C pendant la combustion et il est refroidi par l\'huile projetée dessous.',
   fails:['segments','soupape'] },
 { id:'segments', name:'Segments', sys:'mob', qty:12, exp:[0,1.35,0], mat:'Fonte ou acier traité',
   role:'Anneaux montés dans des gorges du piston. Trois par piston : deux segments d\'étanchéité et un segment racleur d\'huile.',
   how:'Les segments plaquent contre la paroi du cylindre. Les deux premiers empêchent les gaz de passer sous le piston. Le racleur évite que l\'huile du carter monte dans la chambre de combustion.',
   fails:['segments'] },
 { id:'bielle', name:'Bielles', sys:'mob', qty:4, exp:[0,1.1,0], mat:'Acier forgé',
   role:'Relie le piston au vilebrequin. Elle transforme le mouvement rectiligne du piston en rotation.',
   how:'Le petit œil s\'articule sur l\'axe du piston, le grand œil sur un maneton du vilebrequin, par un coussinet à film d\'huile. Elle subit alternativement compression et traction.',
   fails:['huile'] },
 { id:'vilo', name:'Vilebrequin', sys:'mob', qty:1, exp:[0,-1.3,0], mat:'Acier forgé ou fonte GS',
   role:'Arbre coudé qui récupère l\'effort de toutes les bielles et le transforme en couple moteur.',
   how:'Les manetons sont décalés pour que les cylindres s\'allument à intervalles réguliers ; sur un V, chaque coude porte les bielles de deux cylindres en vis-à-vis. Les contrepoids équilibrent les masses. Il tourne sur des paliers lubrifiés et entraîne la distribution à l\'avant, le volant à l\'arrière.',
   fails:['huile'] },
 { id:'volant', name:'Volant moteur', sys:'mob', qty:1, exp:[1.6,-1.3,0], mat:'Fonte ou acier',
   role:'Disque lourd fixé à l\'arrière du vilebrequin. Il lisse les à-coups des temps moteurs et reçoit l\'embrayage.',
   how:'Sa masse emmagasine l\'énergie de la phase de combustion et la restitue pendant les trois autres temps. Sa couronne dentée est entraînée par le démarreur.',
   fails:[] },
 { id:'poulie', name:'Poulie de vilebrequin', sys:'mob', qty:1, exp:[-1.6,-1.3,0], mat:'Acier, avec élastomère (damper)',
   role:'Poulie à l\'avant du vilebrequin. Elle entraîne la courroie d\'accessoires.',
   how:'Elle intègre souvent un amortisseur de vibrations torsionnelles : un anneau d\'acier collé sur du caoutchouc qui absorbe les oscillations du vilebrequin.',
   fails:['alternateur'] },

 { id:'arb_adm', name:'Arbre à cames d\'admission', sys:'dis', qty:1, exp:[0,4.3,0.9], mat:'Fonte ou acier traité',
   role:'Commande l\'ouverture des soupapes d\'admission. Chaque came pousse une soupape au bon moment.',
   how:'Il tourne deux fois moins vite que le vilebrequin, car chaque soupape s\'ouvre une seule fois par cycle de 720°. Le profil de la came fixe l\'instant, la durée et la hauteur de levée.',
   fails:['courroie','soupape'] },
 { id:'arb_ech', name:'Arbre à cames d\'échappement', sys:'dis', qty:1, exp:[0,4.3,-0.9], mat:'Fonte ou acier traité',
   role:'Commande l\'ouverture des soupapes d\'échappement.',
   how:'Même principe que l\'arbre d\'admission, décalé dans le temps. Les deux arbres tournent dans le même sens, entraînés par la même courroie.',
   fails:['courroie','soupape'] },
 { id:'sou_adm', name:'Soupapes d\'admission', sys:'dis', qty:8, exp:[0,3.8,0.6], mat:'Acier allié',
   role:'Ouvrent et ferment le passage entre le conduit d\'admission et la chambre de combustion. Deux par cylindre.',
   how:'Poussée vers le bas par la came à travers le poussoir, la soupape s\'ouvre. Le ressort la rappelle et la plaque sur son siège pour garantir l\'étanchéité pendant la compression et la combustion.',
   fails:['soupape','courroie'] },
 { id:'sou_ech', name:'Soupapes d\'échappement', sys:'dis', qty:8, exp:[0,3.8,-0.6], mat:'Acier réfractaire, parfois creuses au sodium',
   role:'Laissent sortir les gaz brûlés vers le collecteur. Deux par cylindre.',
   how:'Elles subissent près de 800 °C et refroidissent surtout par leur contact avec le siège. C\'est la pièce la plus exposée aux brûlures en cas de mélange trop pauvre ou de réglage trop serré.',
   fails:['soupape','courroie'] },
 { id:'ressort', name:'Ressorts de soupape', sys:'dis', qty:16, exp:[0,3.3,0], mat:'Acier à ressort',
   role:'Rappellent chaque soupape contre son siège après le passage de la came.',
   how:'Leur raideur doit suivre le régime : trop faibles, les soupapes flottent à haut régime et ne se referment pas à temps. Vous les voyez se comprimer quand la soupape descend.',
   fails:['soupape'] },
 { id:'courroie', name:'Courroie de distribution', sys:'dis', qty:1, exp:[-1.8,0,0], mat:'Caoutchouc renforcé de fibres',
   role:'Synchronise la rotation du vilebrequin et celle des arbres à cames avec un rapport exact de 2 pour 1.',
   how:'Courroie crantée qui passe sur le pignon de vilebrequin, les deux pignons de cames et un tendeur. Le moindre saut de dent décale la distribution. Elle se change selon le kilométrage et l\'âge préconisés.',
   fails:['courroie'] },

 { id:'bougie', name:'Bougies', sys:'ign', qty:4, exp:[0,8.4,0], mat:'Acier, céramique, électrode nickel ou iridium',
   role:'Déclenchent la combustion avec une étincelle entre deux électrodes en fin de compression.',
   how:'La bobine fournit 15 000 à 30 000 V. L\'étincelle jaillit dans la chambre et enflamme le mélange. L\'écartement des électrodes est calibré et s\'use avec le temps.',
   fails:['allumage','huile_cache'] },
 { id:'bobine', name:'Bobines d\'allumage', sys:'ign', qty:4, exp:[0,9.4,0], mat:'Cuivre, fer doux, résine',
   role:'Transforment les 12 V de la batterie en haute tension. Une bobine par bougie, posée directement dessus.',
   how:'Le calculateur coupe le courant dans le primaire. Le champ magnétique s\'effondre et crée la haute tension au secondaire, sans fil haute tension intermédiaire.',
   fails:['allumage'] },
 { id:'injecteur', name:'Injecteurs et rampe', sys:'ign', qty:4, exp:[0,2.2,1.8], mat:'Acier inoxydable, électrovanne',
   role:'Pulvérisent le carburant dans le conduit d\'admission, juste devant les soupapes. La rampe les alimente sous pression.',
   how:'Le calculateur commande l\'ouverture de chaque injecteur pendant quelques millisecondes. La durée d\'ouverture dose le carburant selon l\'air aspiré.',
   fails:['injecteurs','riche'] },

 { id:'admission', name:'Collecteur d\'admission', sys:'air', qty:1, exp:[0,1.0,2.4], mat:'Plastique renforcé ou aluminium',
   role:'Répartit l\'air frais entre les cylindres, via un répartiteur et une tubulure par cylindre. Sur un V, il se loge entre les deux bancs.',
   how:'La forme et la longueur des tubulures règlent les ondes de pression pour mieux remplir les cylindres à certains régimes. Toute entrée d\'air parasite après le débitmètre fausse le mélange.',
   fails:['admission'] },
 { id:'papillon', name:'Boîtier papillon', sys:'air', qty:1, exp:[2.2,1.0,2.4], mat:'Aluminium',
   role:'Règle la quantité d\'air qui entre dans le moteur, donc sa puissance.',
   how:'Un volet pivotant ouvre plus ou moins le passage. Il est piloté par l\'accélérateur ou par un moteur électrique. L\'encrassement par les vapeurs d\'huile perturbe le ralenti.',
   fails:['admission'] },
 { id:'echappement', name:'Collecteur d\'échappement', sys:'air', qty:1, exp:[0,0.2,-2.4], mat:'Fonte ou acier inoxydable',
   role:'Rassemble les gaz brûlés des cylindres d\'un banc vers un tuyau unique, en direction du catalyseur.',
   how:'Les tubulures de longueurs égales évitent que les pulsations d\'un cylindre gênent l\'évacuation des autres. Il monte à plusieurs centaines de degrés.',
   fails:['soupape','catalyseur'] },
 { id:'catalyseur', name:'Catalyseur', sys:'air', qty:1, exp:[1.4,-0.5,-2.6], mat:'Monolithe céramique en nid d\'abeille, platine, palladium et rhodium, enveloppe inox',
   role:'Transforme les gaz les plus nocifs, monoxyde de carbone, hydrocarbures imbrûlés et oxydes d\'azote, en gaz moins toxiques.',
   how:'Les gaz traversent des milliers de canaux recouverts de métaux précieux. Au-delà de 250 à 300 °C, les réactions d\'oxydation et de réduction s\'amorcent. Il ne fonctionne bien que si le mélange reste proche de la stœchiométrie, ce que surveillent les sondes lambda. Ici, la ligne s\'arrête juste après lui : sur une voiture, elle continue sous la caisse jusqu\'aux silencieux.',
   fails:['catalyseur','allumage','riche'] },
 { id:'sonde_lambda', name:'Sondes lambda', sys:'air', qty:2, exp:[1.4,0.9,-2.6], mat:'Céramique à la zircone, électrodes de platine, corps inox',
   role:'Mesurent l\'oxygène restant dans les gaz d\'échappement, avant et après le catalyseur.',
   how:'La sonde amont indique au calculateur si le mélange est riche ou pauvre, et il corrige l\'injection en permanence. La sonde aval vérifie que le catalyseur stocke bien l\'oxygène : si ses signaux ressemblent à ceux de la sonde amont, le catalyseur est usé.',
   fails:['riche','catalyseur'] },

 { id:'filtre', name:'Filtre à huile', sys:'flu', qty:1, exp:[0,0,1.8], mat:'Tôle, média papier',
   role:'Retient les particules métalliques et la suie en suspension dans l\'huile.',
   how:'L\'huile traverse un média plissé de l\'extérieur vers le centre. Un clapet de dérivation s\'ouvre si le filtre se colmate, pour ne jamais priver le moteur d\'huile.',
   fails:['huile'] },
 { id:'pompe_huile', name:'Pompe à huile', sys:'flu', qty:1, exp:[-1.6,-1.6,0], mat:'Fonte ou aluminium',
   role:'Aspire l\'huile dans le carter et l\'envoie sous pression vers les paliers, les bielles et la culasse.',
   how:'Souvent à engrenages ou à rotors, entraînée par le vilebrequin. Une soupape de décharge limite la pression. La crépine filtre les gros débris à l\'aspiration.',
   fails:['huile'] },
 { id:'pompe_eau', name:'Pompe à eau', sys:'flu', qty:1, exp:[-1.0,0,-1.6], mat:'Aluminium, roue en fonte ou plastique',
   role:'Fait circuler le liquide de refroidissement entre le moteur et le radiateur.',
   how:'Une roue à aubes brasse le liquide. Elle est entraînée par la courroie de distribution ou d\'accessoires. Un roulement ou une garniture fatigués provoquent bruit ou fuite.',
   fails:['refroid'] },

 { id:'alternateur', name:'Alternateur', sys:'ele', qty:1, exp:[-1.0,0,1.6], mat:'Aluminium, cuivre',
   role:'Génère le courant électrique qui recharge la batterie et alimente le véhicule moteur tournant.',
   how:'Entraîné par la courroie d\'accessoires, il produit du courant alternatif redressé en continu par un pont de diodes. Un régulateur maintient environ 14 V.',
   fails:['alternateur'] },
 { id:'courroie_acc', name:'Courroie d\'accessoires', sys:'ele', qty:1, exp:[-2.2,0,0], mat:'Caoutchouc à nervures',
   role:'Entraîne l\'alternateur, la pompe à eau et, selon les modèles, le compresseur de climatisation.',
   how:'Courroie striée tendue par un galet. Un glissement se traduit par un sifflement au démarrage ou à fort appel de courant.',
   fails:['alternateur','refroid'] }
];

export const PART: Record<string, Part> = Object.fromEntries(PARTS.map((p) => [p.id, p]));

/** Pièces présentes en plusieurs exemplaires selon l'architecture : par cylindre, ou par banc. */
const PER_CYLINDER: Record<string, number> = { piston: 1, segments: 3, bielle: 1, sou_adm: 2, sou_ech: 2, ressort: 4, bougie: 1, bobine: 1, injecteur: 1 };
const PER_BANK: Record<string, number> = { joint: 1, culasse: 1, cache: 1, arb_adm: 1, arb_ech: 1, echappement: 1, catalyseur: 1, sonde_lambda: 2 };

/** Nombre d'exemplaires d'une pièce sur un moteur de `cylinders` cylindres répartis sur `banks` bancs. */
export function quantity(p: Part, cylinders: number, banks: number) {
  if (p.id in PER_CYLINDER) return PER_CYLINDER[p.id] * cylinders;
  if (p.id in PER_BANK) return PER_BANK[p.id] * banks;
  return p.qty;
}
