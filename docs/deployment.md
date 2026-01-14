# Deployment (Vercel)

This project is configured for Vercel with Supabase as the backend. Environment variables are validated at runtime via `src/config/env.ts`, so missing values will fail fast.

## Required environment variables

Set these in Vercel Project Settings → Environment Variables (and locally in `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon public key
- `SUPABASE_SERVICE_ROLE_KEY` – (optional, server-side tasks only; **never expose to client bundles**)

## Supabase schema

Apply `supabase/schema.sql` in the Supabase SQL editor or via `psql` before first deploy. Add Row Level Security policies tailored to your tenancy model before going live.

## Build and runtime

- Build command: `npm run build`
- Install command: `npm install` (default)
- Framework preset: **Next.js**
- API routes: `src/app/api/chat/route.ts` opts into `runtime = "nodejs"` to ensure compatibility with Supabase SDK on Vercel.
- Middleware: `middleware.ts` handles auth redirects; ensure `NEXT_PUBLIC_SUPABASE_*` variables are present for preview/production.

## Local development

1) Copy `.env.example` to `.env.local` and fill in your Supabase values.  
2) Install deps: `npm install`  
3) Run dev server: `npm run dev`  
4) Run lint: `npm run lint`

## Deploy steps (Vercel)

1) Push your repo to GitHub/GitLab/Bitbucket.  
2) Create a new Vercel project and import the repo.  
3) Add the environment variables above for Production (and Preview if needed).  
4) Trigger a deploy; Vercel runs `npm install` and `npm run build` automatically.  
5) Verify the `/dashboard`, `/crm`, `/chatbot`, `/admin`, `/login`, and `/signup` routes load in the deployed environment.
