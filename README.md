# AltFace

> Ton visage. Tes fantasmes. Une autre dimension.

Upload a face photo, write a prompt, get 4 AI-generated images with perfect face consistency.

## Stack

- Vite + React 19 + TypeScript + Tailwind CSS v4
- Netlify Functions (serverless backend)
- fal.ai (flux-2-flex/edit model)
- PWA (installable on iPhone)

## Setup

```bash
npm install
cp .env.example .env
# Add your FAL_KEY to .env
```

## Development

```bash
npm run dev
# Or with Netlify Functions:
npx netlify dev
```

## Deploy to Netlify

1. Push to GitHub
2. Connect repo to Netlify
3. Add `FAL_KEY` environment variable in Netlify dashboard
4. Deploy!

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FAL_KEY` | Your fal.ai API key ([get one here](https://fal.ai/dashboard/keys)) |
