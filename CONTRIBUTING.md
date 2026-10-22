# Contributing

Thanks for helping improve Awesome Reseam. Use the pull request or issue tracker to suggest community patch sources, correct app metadata, or add useful resources. Include the original publisher and source URL so maintainers can verify the listing.

## Develop locally

```sh
npm install
npm run dev
```

The project uses React, TypeScript, and Vite. Curated supporting links are in `data/curated.json`.

## Refresh catalog data

```sh
npm run catalog:update
npm run build
npm run preview
```

The updater reads the official catalog from the Reseam API and community sources from the Patch Bundle Registry. It writes normalized data to `data/catalog.json` and `public/catalog.json`. If a source is unavailable, the last saved data is retained and marked stale.

Community source discovery currently uses the public registry. Curated resource links are edited in `data/curated.json`.

## Deploy

Build the static site with `npm run build` and publish the generated `dist/` directory on a static host.
