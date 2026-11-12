# Mam Cocooning

Site de la Maison d'Assistantes Maternelles **Mam Cocooning**, à Entraigues-sur-la-Sorgue.

Next.js 16 (App Router) · Tailwind CSS 4 · Motion · Vercel Blob · Neon Postgres · ffmpeg

---

## Ce que fait le site

- **Site public** : accueil animé, visite de la maison pièce par pièce, actualités, équipe, contact.
- **Actualités** : un fil de publications datées (texte, photos, vidéos), écrites depuis l'espace privé, comme sur Facebook.
- **Espace privé** (`/admin`) : Sigrid s'y connecte avec un mot de passe unique pour publier, retirer une photo ou une vidéo, et changer les photos de la page d'accueil.
- **Vie privée** : photos et vidéos sont ré-encodées sans aucune métadonnée — la position GPS que les téléphones enregistrent (l'adresse de la maison) disparaît.
- **Repli intégré** : sans base de données configurée, le site sert les photos versionnées dans le dépôt. Il n'est jamais vide, jamais cassé.

---

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs voulues
npm run dev
```

Le site tourne sans aucune variable d'environnement : les actualités affichent alors les photos de `data/legacy-photos.json`.

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

### 4. Première connexion

Redéployer, ouvrir `/admin` et se connecter : la base se crée et se met à jour toute seule, à la première visite comme après chaque mise à jour du site. Il n'y a rien à cliquer.

### 5. Brancher le domaine

Dans **Settings › Domains**, ajouter `mamcocooning.fr` et suivre les instructions DNS de Vercel. Le fichier `CNAME` à la racine ne sert plus qu'à GitHub Pages ; il peut être retiré une fois la bascule faite.

---

## Variables d'environnement

| Variable | Sans elle |
| --- | --- |
| `ADMIN_PASSWORD_HASH` | Connexion à `/admin` impossible |
| `SESSION_SECRET` | Connexion à `/admin` impossible |
| `DATABASE_URL` | Le site sert les photos du dépôt, l'envoi est désactivé |
| `BLOB_READ_WRITE_TOKEN` | L'envoi de photos est désactivé |
| `NEXT_PUBLIC_SITE_URL` | Vaut `https://mamcocooning.fr` |

---

## Comment Sigrid publie

1. Ouvrir `mamcocooning.fr/admin` et se connecter (ça marche depuis un téléphone).
2. Dans **« Nouvelle publication »**, écrire un petit texte, puis **Ajouter des photos ou des vidéos** (jusqu'à 20).
3. Appuyer sur **Publier** : chaque fichier est envoyé, nettoyé (et les vidéos converties), puis la publication apparaît d'un coup dans les Actualités et sur l'accueil.
4. Toucher une photo l'affiche en entier. Une photo ou une vidéo peut être retirée du site depuis la liste du dessous.
5. **« Photos de la page d'accueil »** : chaque pièce de la visite de la maison et les portraits de l'équipe se remplacent en un geste, avec un bouton pour revenir à l'originale.

- Le texte est publié **tel quel** : pas de prénom ni de nom de famille d'enfant.
- Photos iPhone (HEIC) converties automatiquement. Vidéos : 3 minutes et 400 Mo maximum, converties en MP4 lisible partout.
- ⚠️ Ne publier que des photos dont **les parents ont signé l'autorisation de diffusion sur internet**.

---

## Commandes

```bash
npm run dev               # serveur de développement
npm run build             # build de production
npm test                  # 133 tests unitaires
npm run test:watch        # tests en continu
npm run hash:password     # génère ADMIN_PASSWORD_HASH et SESSION_SECRET
npm run legacy:manifest    # régénère data/legacy-photos.json depuis public/img
```

---

## Structure

```
app/            pages et routes API (App Router)
components/     ui/ · layout/ · home/ · feed/ · gallery/ · admin/
lib/            domaine : publications, photos, vidéos, auth, base de données
data/           manifeste des photos du dépôt
public/img/     photos et illustrations
tests/          tests unitaires (Vitest)
legacy/         ancien site statique, conservé pour référence
```
