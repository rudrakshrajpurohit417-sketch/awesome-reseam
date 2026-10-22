# Awesome Reseam

A community directory for finding Android apps with Reseam patches, bundle sources, and recent releases. The interface is organized around an app catalog, matching the way people discover apps before choosing patches. It links to upstream projects and does not host APKs or bundle files.

The catalog interaction pattern is adapted from [Awesome Morphe](https://github.com/nvbangg/awesome-morphe), whose source is licensed under MIT. See [`LICENSE.awesome-morphe`](LICENSE.awesome-morphe) for the required notice. This project uses its own Reseam catalog data, branding, and styling.

## Develop locally

```sh
npm install
npm run dev
```

The site uses React, TypeScript, and Vite. Curated supporting links live in [`data/curated.json`](data/curated.json).

## Refresh catalog data

```sh
npm run catalog:update
npm run build
npm run preview
```

The updater gets app names, icons, app compatibility, and Reseam bundle sources from the public [Patch Bundle Registry API](https://patch-bundles.api.jmancentral.com). It selects the latest stable release for each indexed Reseam source and reads each publisher's native `patches.json` through the registry API. The official current release is fetched directly from the [Reseam API](https://api.reseam.app/patches.json). The API refresh preserves source attribution and links to publishers.

In the catalog, app cards open compact patch previews grouped by bundle, with a per-bundle control to expand the full list. “Add to Reseam” opens Reseam's prefilled [Add patch source](https://reseam.app/add/) page for that publisher. GitHub community sources use the standard latest-release index URL described in the [Reseam publishing guide](https://reseam.app/docs/authoring/publishing/). The toolbar keeps the same control positions across Apps, Bundles, and What's New.

The directory uses the Reseam site's favicon as a brand identifier, alongside its dark and green palette. It remains an independent community project and does not imply endorsement.

Normalized metadata is saved to [`data/catalog.json`](data/catalog.json), which is committed as a fallback snapshot. If the registry or a bundle source is unavailable, the updater retains the prior snapshot for that source and the site displays a stale-source notice. Catalog counts and release history reflect the data published by upstream sources and the registry; they are refreshed at build time.

## Deploy

Run `npm run build` and publish the generated `dist/` directory on any static host. For current data, run the catalog updater and build in CI before deployment. The saved catalog snapshot keeps the site usable when an upstream source is temporarily unavailable.

## Contributing

Suggest a bundle, app metadata correction, or useful resource through an issue or pull request. Include the original publisher and source URL so maintainers can verify the listing. Community bundle discovery currently comes from the public registry; curated resource links are maintained in `data/curated.json`.

## Disclaimer

This is an independent community directory and is not affiliated with or endorsed by Reseam. Use sources you trust. Patch and release metadata is attributed to the official Reseam catalog, the bundle publisher, or the public registry.
