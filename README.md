# Mam Cocooning

Site de la Maison d'Assistantes Maternelles **Mam Cocooning**, à Entraigues-sur-la-Sorgue.

Next.js 16 (App Router) · Tailwind CSS 4 · Motion · Vercel Blob · Neon Postgres · Gemini

---

## Ce que fait le site

- **Site public** : accueil animé, visite de la maison pièce par pièce, journée type, équipe, contact.
- **Galerie dynamique** : les catégories d'activités n'existent que si au moins une photo s'y trouve. Elles apparaissent et disparaissent toutes seules.
- **Espace privé** (`/admin`) : Sigrid s'y connecte avec un mot de passe unique, dépose ses photos, et **Gemini les range automatiquement** dans la bonne catégorie en rédigeant leur description.
- **Repli intégré** : sans base de données configurée, le site sert les 64 photos versionnées dans le dépôt. Il n'est jamais vide, jamais cassé.

---

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs voulues
npm run dev
```

Le site tourne sans aucune variable d'environnement : la galerie utilise alors `data/legacy-photos.json`.

---

## Déploiement sur Vercel (gratuit)

### 1. Importer le projet

Sur [vercel.com/new](https://vercel.com/new), importer le dépôt GitHub. Vercel détecte Next.js tout seul, aucun réglage de build à faire.

### 2. Créer le stockage

Dans le projet Vercel, onglet **Storage** :

| Créer | Variable ajoutée automatiquement |
| --- | --- |
| **Blob** | `BLOB_READ_WRITE_TOKEN` |
| **Neon (Postgres)** | `DATABASE_URL` |

Les deux ont une offre gratuite largement suffisante pour le volume de photos d'une MAM.

### 3. Générer le mot de passe de l'espace privé

```bash
npm run hash:password "le mot de passe de Sigrid"
```

La commande affiche deux lignes, à copier dans **Settings › Environment Variables** :

```
ADMIN_PASSWORD_HASH=…
SESSION_SECRET=…
```

> Le mot de passe en clair n'est jamais stocké : seule son empreinte scrypt l'est.

### 4. Ajouter la clé Gemini

Créer une clé gratuite sur [aistudio.google.com/apikey](https://aistudio.google.com/apikey), puis l'ajouter :

```
GEMINI_API_KEY=…
```

Sans cette clé, l'envoi de photos fonctionne toujours : elles arrivent simplement dans « Le quotidien », à reclasser à la main.

### 5. Initialiser la base

Redéployer, ouvrir `/admin`, se connecter, puis cliquer sur **« Initialiser la base »** en bas de page. Cela crée les tables, enregistre les catégories et importe les photos déjà présentes. L'opération est rejouable sans risque.

### 6. Brancher le domaine

Dans **Settings › Domains**, ajouter `mamcocooning.fr` et suivre les instructions DNS de Vercel. Le fichier `CNAME` à la racine ne sert plus qu'à GitHub Pages ; il peut être retiré une fois la bascule faite.

---

## Variables d'environnement

| Variable | Sans elle |
| --- | --- |
| `ADMIN_PASSWORD_HASH` | Connexion à `/admin` impossible |
| `SESSION_SECRET` | Connexion à `/admin` impossible |
| `DATABASE_URL` | Le site sert les photos du dépôt, l'envoi est désactivé |
| `BLOB_READ_WRITE_TOKEN` | L'envoi de photos est désactivé |
| `GEMINI_API_KEY` | Les photos arrivent dans « Le quotidien », à reclasser |
| `NEXT_PUBLIC_SITE_URL` | Vaut `https://mamcocooning.fr` |

---

## Comment Sigrid publie une photo

1. Ouvrir `mamcocooning.fr/admin` et se connecter.
2. Glisser ses photos, ou appuyer sur **Choisir des photos** (ça marche depuis un téléphone).
3. Chaque photo est nettoyée, analysée, rangée et publiée. Le site se met à jour seul.
4. Si une photo est mal rangée, la liste du dessous permet de changer sa catégorie ou de la retirer.

Chaque photo est ré-encodée en WebP, redimensionnée, et **toutes ses métadonnées EXIF sont supprimées** — y compris les coordonnées GPS que les téléphones enregistrent, qui correspondent à l'adresse de la maison.

---

## Commandes

```bash
npm run dev               # serveur de développement
npm run build             # build de production
npm test                  # 102 tests unitaires
npm run test:watch        # tests en continu
npm run hash:password     # génère ADMIN_PASSWORD_HASH et SESSION_SECRET
npm run legacy:manifest    # régénère data/legacy-photos.json depuis public/img
npm run legacy:classify    # (re)classe les photos du dépôt avec Gemini
```

---

## Structure

```
app/            pages et routes API (App Router)
components/     ui/ · layout/ · home/ · gallery/ · admin/
lib/            domaine : photos, catégories, auth, images, Gemini
data/           catégories seed et manifeste des photos du dépôt
public/img/     photos et illustrations
tests/          tests unitaires (Vitest)
legacy/         ancien site statique, conservé pour référence
```
