/** Editorial content for the public pages, kept in one place. */

export const SITE = {
  name: 'Mam Cocooning',
  tagline: 'Un cocon pour grandir en douceur',
  description:
    'Maison d’Assistantes Maternelles à Entraigues-sur-la-Sorgue. Un accueil chaleureux, des activités d’éveil et une équipe agréée pour les enfants de 0 à 3 ans.',
  address: {
    street: '10 allée de la Grange de Javon',
    postalCode: '84320',
    city: 'Entraigues-sur-la-Sorgue',
    country: 'France',
  },
  phone: '06 67 41 86 35',
  phoneHref: '+33667418635',
  hours: { days: 'Du lundi au vendredi', time: '7h30 – 17h30' },
  /** Neighbouring towns parents actually commute from, for local search. */
  areaServed: [
    'Entraigues-sur-la-Sorgue',
    'Vedène',
    'Saint-Saturnin-lès-Avignon',
    'Sorgues',
    'Althen-des-Paluds',
    'Avignon',
  ],
  mapEmbedUrl:
    'https://maps.google.com/maps?width=100%25&height=600&hl=fr&q=10%20All.%20de%20la%20Grange%20de%20Javon%2084320%20Entraigues-sur-la-Sorgue&t=&z=15&ie=UTF8&iwloc=B&output=embed',
} as const

export const NAV_LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/actualites', label: 'Actualités' },
  { href: '/equipe', label: 'L’équipe' },
  { href: '/contact', label: 'Contact' },
] as const

export interface TeamMember {
  readonly name: string
  readonly role: string
  readonly since: string
  readonly bio: string
  readonly photoUrl: string | null
  readonly initials: string
  /** Shown on the team and contact pages. */
  readonly phone: { readonly display: string; readonly href: string } | null
}

export const TEAM: readonly TeamMember[] = [
  {
    name: 'Sigrid Gozzo',
    role: 'Assistante maternelle agréée',
    since: 'Agréée depuis 2008',
    bio: 'Je m’épanouis pleinement dans le secteur de la petite enfance en offrant un accueil bienveillant, des activités ludiques et un environnement propice à l’éveil et au développement harmonieux des enfants.',
    photoUrl: '/img/equipe/sigrid-gozzo.webp',
    initials: 'SG',
    phone: { display: '06 67 41 86 35', href: '+33667418635' },
  },
  {
    name: 'Julie Delannoy',
    role: 'Assistante maternelle agréée',
    since: 'Rejoint la MAM en 2025',
    bio: 'Julie, c’est le rayon de soleil de la MAM ! Toujours partante pour une chanson, une chasse aux trésors dans le jardin ou une course de petites voitures, elle transforme chaque journée en aventure. Et quand vient l’heure du câlin ou de la sieste, elle sait aussi faire tout doux. Avec elle, on rit beaucoup… et on grandit encore plus.',
    photoUrl: '/img/equipe/julie-delannoy.webp',
    initials: 'JD',
    phone: { display: '06 87 35 91 66', href: '+33687359166' },
  },
]

export interface Value {
  /** Key into the doodle set in components/ui/doodles.tsx. */
  readonly doodle: 'heart' | 'teddy' | 'star' | 'rainbow'
  readonly title: string
  readonly body: string
}

export const VALUES: readonly Value[] = [
  {
    doodle: 'heart',
    title: 'Un rythme respecté',
    body: 'Chaque enfant a son propre tempo.',
  },
  {
    doodle: 'teddy',
    title: 'Comme à la maison',
    body: 'Un pavillon lumineux avec jardin, pensé à hauteur d’enfant, dans un petit groupe familial.',
  },
  {
    doodle: 'star',
    title: 'Deux professionnelles agréées',
    body: 'Un agrément du Conseil départemental, une formation continue et les gestes de premiers secours à jour.',
  },
  {
    doodle: 'rainbow',
    title: 'Des nouvelles chaque semaine',
    body: 'Les photos des activités sont publiées ici. Vous voyez ce que votre enfant a vécu dans la journée.',
  },
]


export interface Stat {
  readonly value: number
  readonly suffix: string
  readonly label: string
}

export const STATS: readonly Stat[] = [
  { value: 18, suffix: ' ans', label: 'd’expérience auprès des tout-petits' },
  { value: 8, suffix: '', label: 'enfants maximum, pour un vrai cocon' },
  { value: 10, suffix: 'h', label: 'd’amplitude horaire, 7h30 à 17h30' },
  { value: 2, suffix: '', label: 'professionnelles agréées et formées' },
]

export interface TourStop {
  readonly image: string
  readonly title: string
  readonly body: string
}

/** Tour stops shown in the collage at the top of the homepage, in display order. */
export const HERO_STOP_INDEXES = [0, 3, 1, 5] as const

/** Guided tour of the house, shot room by room. */
export const HOUSE_TOUR: readonly TourStop[] = [
  {
    image: '/img/carroussel/Rectangle 2.png',
    title: 'L’espace de vie',
    body: 'Le cœur de la maison : jouets à hauteur d’enfant, casier nominatif et espace change juste à côté.',
  },
  {
    image: '/img/carroussel/Rectangle 17.png',
    title: 'La salle de jeux',
    body: 'Piscine à balles, tapis de motricité et cuisine en bois, ouverte sur la lumière du jardin.',
  },
  {
    image: '/img/carroussel/Rectangle 16.png',
    title: 'Le coin des jeux libres',
    body: 'Des bacs de rangement colorés que les enfants ouvrent seuls : choisir son jeu, puis le ranger.',
  },
  {
    image: '/img/carroussel/Rectangle 1.png',
    title: 'La chambre des nuages',
    body: 'Une pièce calme, tamisée, avec des nuages au plafond et un matelas pour chaque enfant.',
  },
  {
    image: '/img/carroussel/Rectangle 15.png',
    title: 'Les lits des plus petits',
    body: 'Un lit à barreaux par bébé et un fauteuil pour les biberons, à l’écart de l’agitation.',
  },
  {
    image: '/img/carroussel/Rectangle 3.png',
    title: 'La cuisine et la table',
    body: 'Les repas se préparent ici et se partagent à la petite table, chacun sur sa chaise.',
  },
  {
    image: '/img/carroussel/Rectangle 12.png',
    title: 'La salle d’eau',
    body: 'Lavabo bas, pot et fresque marine : l’apprentissage de la propreté sans appréhension.',
  },
  {
    image: '/img/carroussel/Rectangle 14.png',
    title: 'Le dortoir côté jardin',
    body: 'Fenêtre sur la verdure, volets tamisés : les siestes se font au calme, au rythme de chacun.',
  },
  {
    image: '/img/carroussel/Rectangle 11.png',
    title: 'La maison',
    body: 'Un pavillon de plain-pied avec jardin clos, portillon sécurisé et terrasse ombragée.',
  },
]
