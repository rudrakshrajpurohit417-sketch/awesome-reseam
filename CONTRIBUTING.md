# Contributing

Thanks for helping improve Awesome Reseam. Use the pull request or issue tracker to suggest community patch sources, correct app metadata, or add useful resources. Include the original publisher and source URL so maintainers can verify the listing.

## Develop locally

```sh
npm install
npm run dev
```

The project uses React, TypeScript, and Vite. Curated supporting links are in `data/curated.json`. Manual patch-source entries, app names/icons, and verified Google Play overrides live in `config/catalog-config.json`.

## Add or update a patch source

1. Verify the source repository, latest stable release/index schema, compatibility metadata, and actual bundle icon.
2. Add manual source information to `config/catalog-config.json`. Keep app-specific icon/name overrides and Google Play status evidence in `curatedAppMetadata` in that same file.
3. Run the source refresh and validators:

```sh
npm run catalog:update
npm run validate:catalog
npm run typecheck
npm run build
```

The updater reads the official Reseam catalog, community registry, and configured manual sources. It generates `data/catalog.json` and `public/catalog.json`; do not edit generated files directly. A source that cannot be refreshed should remain visible as stale and must not be treated as verified.

## Build and preview

```sh
npm ci
npm run validate:catalog
npm run build
npm run preview
```

The production build uses the checked-in catalog and does not fetch upstream APIs. This makes routine UI changes faster and avoids making deployments depend on third-party registry availability. Use `npm run catalog:update` explicitly when catalog data needs refreshing.

Curated resource links are edited in `data/curated.json`.

## Deploy

Build the static site with `npm run build` and publish the generated `dist/` directory on a static host.
