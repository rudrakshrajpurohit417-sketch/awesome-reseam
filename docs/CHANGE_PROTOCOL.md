# Awesome Reseam — Change and Release Protocol

This is the required checklist for **every edit**, not just adding a source. Do not treat a Vercel deployment marked READY as proof that the whole website works.

## 1. Pre-change stability gate — run before editing

Record the current production deployment URL, deployment state, commit SHA and time. Confirm the production alias points to the intended deployment. Confirm the latest GitHub CI/build run and catalog-refresh run completed successfully. Check the current production home page, built JavaScript/CSS assets, and `catalog.json` with:

```sh
npm ci
npm run smoke:production
npm run validate:catalog
```

If a local machine cannot reach production, use the Vercel deployment metadata and GitHub Actions logs as partial evidence, **not** as a replacement for the smoke test. Explicitly mark the site as partially verified and list what could not be checked. If the current site has a broken asset, invalid catalog, failed build, missing alias, or client error, stop unrelated feature work and establish a known-good baseline first. Never describe the site as fully stable until the checks actually pass.

## 2. When adding a source or bundle

1. Open the original repository and identify the owner, project name, license, maintenance state, canonical homepage, release page, and the documented Reseam index URL. Never guess a release file path: inspect the repository, workflow, and latest release asset first.
2. Download the published index and validate its real schema. Check the latest stable release before prereleases; count and inspect patches, IDs, descriptions, compatibility packages/versions, hidden flags, options, required fields, and release metadata. Confirm that each patch is attributed to the source it actually came from. Do not invent patch data or silently convert missing fields into plausible values.
3. Inspect the source repository for a real bundle logo or declared `bundle.icon_url` / `bundle.iconUrl`. Prefer the bundle's own branding asset. If it genuinely has no bundle image, use the source owner's verified GitHub avatar as a documented fallback. **Do not use a target app icon as a bundle icon.** Verify the selected image URL returns an image and belongs to the intended owner/source.
4. For every app package ID introduced by the source, inspect the exact Google Play listing URL by package name. Check both US and India markets. Use a green **Google Play** action only when the listing is positively detected. If both markets explicitly report no listing, show **Not on Google Play** in a non-green, non-clickable status. If Google blocks the check, the response is ambiguous, or markets disagree, use a neutral **Check Google Play** link; never imply availability from an unchecked URL. Keep a verifiable evidence URL for manual overrides.
5. Resolve human-readable app name and icon from official metadata where possible. Any curated override needs a reason and evidence. Keep app icon, bundle icon, source avatar, and website logo as distinct asset roles.
6. Check for duplicate source URLs, duplicate patch IDs within each source, duplicate package IDs, invalid compatibility arrays, empty releases, wrong add-to-Reseam URL, and stale/failed sources. A failed source refresh must not silently replace valid catalog data with an empty/partial source.
7. Regenerate `data/catalog.json` and `public/catalog.json` through the script. Do not hand-edit generated copies. Run validation and inspect the actual generated records before publishing.

## 3. For UI, logic, styling, or refactors

1. Identify connected data types, producers, consumers, styles, route state, accessibility attributes, and mobile/desktop breakpoints before changing a component.
2. Preserve established visual hierarchy and non-target behavior. Keep unknown/unavailable states explicit, and do not use a success color for unverified states.
3. Check keyboard operation, focus, semantic labels, reduced-motion preferences, loading/error/empty states, external-link behavior, and console/network errors. Test both the card/grid surface and any detail view affected by the change.
4. Do not bundle unrelated cleanup into a bug fix unless required. Explain any unavoidable scope expansion.

## 4. Required pre-publish checks

Run all of these after the change:

```sh
npm ci
npm run catalog:update
npm run validate:catalog
npm run typecheck
npm run build
```

The build includes catalog generation, structural validation, TypeScript compilation, and Vite production compilation. Review the diff to ensure generated catalogs match and no unrelated files changed. The `App checks` workflow provides a clean-run build gate.

## 5. Required post-deploy checks

1. Wait for the deployment system to report READY, then verify the production alias is assigned to the new commit.
2. Run `npm run smoke:production` and confirm the home page, JS/CSS assets, and `catalog.json` return HTTP 200 with valid content.
3. Open the actual production website at desktop and mobile widths. Inspect Apps, Bundles, News, app details, bundle details, Google Play states, Add to Reseam/source links, and browser console/network errors. A static HTTP smoke test does not replace visual browser testing.
4. Verify important source counts and status labels against the generated catalog. Check that available Google Play actions are green and that unavailable/unknown actions are not green.
5. Only call the task finished when automated checks and required visual checks passed. If live browser access or network access is unavailable, state that limitation and leave the status as partially verified rather than claiming complete stability.

## 6. Failure and rollback rules

- Never overwrite a known-good catalog with an empty or malformed refresh.
- If a required build or smoke check fails, inspect logs and fix the cause before adding more changes.
- If a production regression is confirmed, revert the smallest responsible commit or roll back to the last known-good deployment, then rerun the smoke checks.
- Record the production URL, deployed commit, build/workflow run, validations performed, unresolved warnings, and rollback details in the completion summary.

## Release gate checklist

- [ ] Pre-change production and CI baseline recorded.
- [ ] Source and ownership verified; release/index schema inspected.
- [ ] Bundle logo verified independently from app icons.
- [ ] Every app package has an evidence-backed Google Play status or an explicit unknown status.
- [ ] Generated catalog and public catalog agree and pass validation.
- [ ] TypeScript and production build pass.
- [ ] CI is green.
- [ ] Production deployment is READY and alias points to the intended commit.
- [ ] Production HTTP smoke test passes.
- [ ] Desktop/mobile visual checks and console/network checks pass, or clearly documented as unverified.
