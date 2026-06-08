# IndustryMapper Web

This folder contains the frontend application for IndustryMapper.

## Getting Started

Run the development server from inside `web/`:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Scripts

- `npm run dev` starts the local development server
- `npm run lint` runs ESLint
- `npm run build` creates a production build

## Current State

The current frontend includes:

- an App Router foundation
- shared scope and severity constants
- a product-facing landing shell
- a health endpoint at `/api/health`
- environment placeholders for future Supabase integration

## Next Steps

The next implementation steps for this app are:

1. connect the Supabase client and generated database types
2. add map rendering and viewport-driven event queries
3. build filter state, event list, and detail panels
4. connect real article and event data once the ingestion pipeline is live
