# AltFace

> **Ton visage. Tes fantasmes. Une autre dimension.**

Application web NSFW de type "face lock generator" : upload une photo de visage, ecris un prompt, obtiens 4 images generees par IA avec le meme visage (face consistency maximale).

---

## Fonctionnalites

- **Upload photo** : drag & drop ou click, compression automatique cote client (max 1024px)
- **Prompt NSFW** : textarea libre + 4 suggestions rapides en un tap
- **Generation** : 4 images en parallele via fal.ai, apparition progressive
- **Lightbox** : click sur une image pour la voir en plein ecran
- **Telechargement** : bouton download sur chaque image
- **PWA** : installable sur iPhone depuis Safari (Ajouter a l'ecran d'accueil)
- **Dark mode** : theme premium noir/rouge, mobile-first

## Architecture

```
AltFace/
├── index.html                    # Point d'entree HTML
├── package.json                  # Dependances et scripts
├── vite.config.ts                # Vite + React + Tailwind v4 + PWA
├── tsconfig.json                 # Config TypeScript (src)
├── tsconfig.node.json            # Config TypeScript (vite config)
├── netlify.toml                  # Config build + functions Netlify
├── .env.example                  # Template variables d'environnement
├── .gitignore
├── README.md                     # Ce fichier
├── public/
│   ├── favicon.svg               # Favicon SVG "AltFace"
│   ├── icon-192.png              # Icone PWA 192x192
│   └── icon-512.png              # Icone PWA 512x512
├── netlify/
│   └── functions/
│       ├── submit.ts             # Upload image + soumission 4 jobs fal.ai
│       └── result.ts             # Polling du statut d'un job
└── src/
    ├── main.tsx                  # Point d'entree React
    ├── index.css                 # Tailwind v4 + theme custom + animations
    └── App.tsx                   # UI complete (upload, prompt, grille, lightbox)
```

## Stack technique

| Composant | Version | Role |
|-----------|---------|------|
| React | 19.x | UI |
| Vite | 6.x | Build & dev server |
| TypeScript | 5.x | Typage |
| Tailwind CSS | 4.x | Styles (CSS-first config) |
| vite-plugin-pwa | 1.2.x | PWA / Service Worker |
| @fal-ai/client | 1.9.x | API fal.ai |
| @netlify/functions | 5.x | Types Netlify Functions v2 |
| Netlify | - | Hosting + Functions serverless |

## Flow technique

```
[Client]                        [Netlify Functions]              [fal.ai]
   |                                   |                            |
   |-- Upload photo + prompt --------->|                            |
   |                                   |-- fal.storage.upload() --->|
   |                                   |<-- imageUrl ---------------|
   |                                   |-- 4x fal.queue.submit() ->|
   |                                   |<-- 4x requestId ----------|
   |<-- { requestIds } ---------------|                            |
   |                                   |                            |
   |-- poll /api/result (x4) -------->|                            |
   |                                   |-- fal.queue.status() ---->|
   |                                   |<-- COMPLETED + imageUrl --|
   |<-- { status, image } ------------|                            |
   |                                   |                            |
   | (images apparaissent une par une)                              |
```

### Pourquoi 2 fonctions (submit + result) ?

fal.ai peut prendre 30s+ par image. Netlify Functions timeout a 10s (free) / 26s (pro). L'architecture queue + polling evite tout timeout :
- `submit` : rapide (~2-3s), upload l'image et soumet les jobs
- `result` : rapide (~200ms), verifie le statut d'un job

## Setup local

```bash
# 1. Installer les dependances
npm install

# 2. Configurer la cle API
cp .env.example .env
# Editer .env et ajouter ta FAL_KEY

# 3. Lancer en dev
npm run dev

# Ou avec les fonctions Netlify :
npx netlify dev
```

## Deploiement Netlify

1. Push le repo sur GitHub
2. Connecter le repo a Netlify (app.netlify.com)
3. Ajouter la variable d'environnement `FAL_KEY` dans : **Site settings > Environment variables**
4. Le build se lance automatiquement a chaque push sur `main`

## Variables d'environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `FAL_KEY` | Oui | Cle API fal.ai ([obtenir ici](https://fal.ai/dashboard/keys)) |

## Cout API

Pay-as-you-go fal.ai : **~0.05$ par image**, soit **~0.20$ pour 4 images** par generation.

## Modele IA

- **Modele** : `fal-ai/ip-adapter-face-id` (IP-Adapter Face ID, SDXL)
- **Variante** : `SDXL-v2-plus` avec base `RealVisXL_V3.0` (photoréalisme haute qualité)
- **Face lock** : `face_image_url` pour verrouiller le visage (auto-resize 640x640)
- **NSFW** : aucun safety checker (ni paramètre ni filtre serveur)
- **Qualité** : 768x1024, 50 steps, guidance 7.5
- **Cout** : $0/compute-second (gratuit)
- **Queue** : `fal.queue.submit()` + `fal.queue.status()` + `fal.queue.result()`

## Changelog

### v1.2.0 - 2026-04-03
- Switch de `fal-ai/pulid` vers `fal-ai/ip-adapter-face-id` (SDXL-v2-plus)
- Raison : meilleure qualité d'image (SDXL + RealVisXL), aucun filtre NSFW
- Face lock via `face_image_url`, resolution 768x1024, 50 inference steps
- Gratuit ($0/compute-second)

### v1.1.0 - 2026-04-03
- Switch de `fal-ai/flux-2-flex/edit` vers `fal-ai/pulid`
- Raison : flux-2-flex bloquait les prompts NSFW cote serveur

### v1.0.0 - 2026-04-03
- Initial release
- Upload photo avec drag & drop + compression client
- Prompt NSFW avec suggestions rapides
- Generation 4 images paralleles via fal.ai
- Architecture queue/polling (submit + result) pour eviter les timeouts
- Grille 2x2 avec chargement progressif
- Lightbox fullscreen + telechargement
- PWA installable (VitePWA)
- Theme dark premium noir/rouge, mobile-first
- Deploiement Netlify
