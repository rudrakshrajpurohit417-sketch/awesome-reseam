import { mkdir, readFile, writeFile } from 'node:fs/promises'

const outputPath = new URL('../data/catalog.json', import.meta.url)
const registryApi = 'https://patch-bundles.api.jmancentral.com'
const officialUrl = 'https://api.reseam.app/patches.json'
const manualSources = [
  {
    name: 'BaconReader Patches',
    author: 'JoanComasFdz',
    sourceUrl: 'https://github.com/JoanComasFdz/baconreader-reseam-patches',
    indexJsonUrl: 'https://github.com/JoanComasFdz/baconreader-reseam-patches/releases/latest/download/patches.json',
  },
]
const previous = JSON.parse(await readFile(outputPath, 'utf8'))
const staleSources = []

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

async function fetchAll(path) {
  const first = await fetchJson(`${registryApi}${path}${path.includes('?') ? '&' : '?'}limit=100&offset=0`)
  const rows = [...(first.data ?? [])]
  for (let offset = 100; offset < (first.total ?? 0); offset += 100) {
    const page = await fetchJson(`${registryApi}${path}${path.includes('?') ? '&' : '?'}limit=100&offset=${offset}`)
    rows.push(...(page.data ?? []))
  }
  return rows
}

function addToReseamUrl(sourceUrl, official = false) {
  if (official) return officialUrl
  try {
    const url = new URL(sourceUrl)
    if (/\/patches\.json$/i.test(url.pathname)) return url.href
    if (url.hostname === 'github.com') {
      const [owner, repo] = url.pathname.split('/').filter(Boolean)
      if (owner && repo) return `https://github.com/${owner}/${repo.replace(/\.git$/, '')}/releases/latest/download/patches.json`
    }
  } catch { /* Invalid or unsupported publisher URL. */ }
  return null
}

function patchesFromIndex(index, bundleName, sourceName, sourceUrl) {
  const release = index?.releases?.find((item) => !item.prerelease && Array.isArray(item.patches)) ?? index?.releases?.find((item) => Array.isArray(item.patches))
  if (!release || !Array.isArray(release.patches)) throw new Error('No release with patch metadata was found')
  return release.patches.filter((patch) => !patch.hidden).map((patch) => ({
    id: patch.id ?? `${bundleName}:${patch.name}`,
    name: patch.name ?? 'Unnamed patch',
    description: patch.description ?? '',
    bundle: bundleName,
    sourceName,
    sourceUrl,
    sourceVersion: release.version ?? 'unknown',
    apps: (patch.compatibility?.packages ?? []).map((entry) => ({ package: entry.package, versions: entry.versions ?? [] })),
    options: patch.options ?? [],
  }))
}

let previousCatalog = previous
let apiApps = previous.apps ?? []
let registryBundles = previous.bundles ?? []
let apiOk = false
try {
  const [appRows, bundleRows] = await Promise.all([
    fetchAll('/apps?ecosystem=reseam'),
    fetchAll('/bundles?ecosystem=reseam'),
  ])
  apiApps = appRows
  registryBundles = bundleRows
  apiOk = true
} catch (error) {
  if (!apiApps.length && !registryBundles.length) throw new Error(`Could not fetch the Reseam community catalog and no usable cached copy exists: ${error.message}`)
  staleSources.push({ name: 'Reseam community catalog', url: `${registryApi}/apps?ecosystem=reseam`, error: error.message })
}

let official = previous.official
try {
  const index = await fetchJson(officialUrl)
  const release = index?.releases?.find((item) => !item.prerelease && Array.isArray(item.patches))
  if (!release) throw new Error('Official index contains no stable patch release')
  official = {
    name: index.bundle?.name ?? 'Reseam patches',
    author: index.bundle?.author ?? 'Reseam',
    description: index.bundle?.description ?? 'Official patches for Android apps',
    homepage: index.bundle?.homepage ?? 'https://reseam.app/patches/',
    url: 'https://reseam.app/patches/',
    indexUrl: officialUrl,
    addUrl: addToReseamUrl(officialUrl, true),
    version: release.version ?? 'unknown',
    updatedAt: release.created_at ?? null,
    releases: (index.releases ?? []).slice(0, 20).map(({ version, created_at, description, prerelease }) => ({ version, createdAt: created_at, description: description ?? '', prerelease: Boolean(prerelease) })),
    patches: patchesFromIndex({ releases: [release] }, index.bundle?.name ?? 'reseam-patches', index.bundle?.name ?? 'Reseam patches', 'https://reseam.app/patches/'),
  }
} catch (error) {
  if (!official?.patches?.length) throw new Error(`Could not fetch official catalog and no usable cached copy exists: ${error.message}`)
  staleSources.push({ name: 'Reseam official catalog', url: officialUrl, error: error.message })
}

const newestStableBySource = new Map()
for (const bundle of registryBundles) {
  if (bundle.bundle_type !== 'Reseam' || bundle.is_prerelease || bundle.metadata_status === 'missing') continue
  const prior = newestStableBySource.get(bundle.source_id)
  if (!prior || new Date(bundle.created_at ?? 0) > new Date(prior.created_at ?? 0)) newestStableBySource.set(bundle.source_id, bundle)
}

const community = []
for (const bundle of newestStableBySource.values()) {
  if (/git\.reseam\.app\/reseam\/patches/.test(bundle.source?.url ?? '')) continue
  const sourceUrl = bundle.source?.url
  if (!sourceUrl) continue
  try {
    const params = new URLSearchParams({ source_url: sourceUrl, version: bundle.version, channel: 'stable' })
    const index = await fetchJson(`${registryApi}/api/reseam/patches.json?${params}`)
    const release = index.releases?.find((item) => item.version.replace(/^v/, '') === bundle.version.replace(/^v/, '')) ?? index.releases?.find((item) => !item.prerelease && Array.isArray(item.patches))
    if (!release || !Array.isArray(release.patches)) throw new Error('The source index did not contain a stable patch list')
    const sourceName = bundle.reseam_bundle?.name ?? index.bundle?.name ?? bundle.source.repo ?? 'Community bundle'
    community.push({
      name: sourceName,
      author: bundle.reseam_bundle?.author ?? index.bundle?.author ?? bundle.source.source_metadatum?.owner_name ?? 'Unknown author',
      description: bundle.reseam_bundle?.description ?? index.bundle?.description ?? bundle.source.source_metadatum?.repo_description ?? '',
      homepage: index.bundle?.homepage ?? sourceUrl,
      indexUrl: sourceUrl,
      addUrl: addToReseamUrl(sourceUrl),
      version: bundle.version,
      updatedAt: bundle.created_at ?? null,
      patchCount: bundle.patch_count ?? release.patches.length,
      iconUrl: bundle.icon_url ?? bundle.owner_avatar_url ?? null,
      metadataStatus: bundle.metadata_status ?? 'unknown',
      releases: (index.releases ?? []).slice(0, 20).map(({ version, created_at, description, prerelease }) => ({ version, createdAt: created_at, description: description ?? '', prerelease: Boolean(prerelease) })),
      patches: patchesFromIndex({ releases: [release] }, index.bundle?.name ?? sourceName, sourceName, sourceUrl),
    })
  } catch (error) {
    const old = (previous.community ?? []).find((item) => item.indexUrl === sourceUrl)
    if (old) community.push(old)
    staleSources.push({ name: bundle.reseam_bundle?.name ?? sourceUrl, url: sourceUrl, error: error.message })
  }
}


/*
 * Sources listed here are fetched directly from their published patches.json.
 * This keeps useful bundles visible even before the community registry indexes them.
 */
function normalizeSourceUrl(value) {
  try {
    const url = new URL(value)
    if (url.hostname.toLowerCase() === 'github.com') {
      const [owner, repo] = url.pathname.split('/').filter(Boolean)
      if (owner && repo) {
        const cleanRepo = repo.toLowerCase().endsWith('.git') ? repo.slice(0, -4) : repo
        return `https://github.com/${owner}/${cleanRepo}`.toLowerCase()
      }
    }
    const normalized = url.href.endsWith('/') ? url.href.slice(0, -1) : url.href
    return normalized.toLowerCase()
  } catch {
    const text = String(value ?? '')
    return (text.endsWith('/') ? text.slice(0, -1) : text).toLowerCase()
  }
}

for (const manualSource of manualSources) {
  try {
    const index = await fetchJson(manualSource.indexJsonUrl)
    const release = index?.releases?.find((item) => !item.prerelease && Array.isArray(item.patches))
      ?? index?.releases?.find((item) => Array.isArray(item.patches))
    if (!release || !Array.isArray(release.patches)) throw new Error('No release with patch metadata was found')

    const sourceName = index.bundle?.name ?? manualSource.name
    const sourceIndex = community.findIndex((item) => normalizeSourceUrl(item.indexUrl) === normalizeSourceUrl(manualSource.sourceUrl))
    if (sourceIndex >= 0) community.splice(sourceIndex, 1)

    community.push({
      name: sourceName,
      author: index.bundle?.author ?? manualSource.author,
      description: index.bundle?.description ?? 'Patches that restore and improve BaconReader for current Reddit.',
      homepage: index.bundle?.homepage ?? manualSource.sourceUrl,
      indexUrl: manualSource.sourceUrl,
      addUrl: manualSource.sourceUrl,
      version: release.version ?? 'unknown',
      updatedAt: release.created_at ?? null,
      patchCount: release.patches.filter((patch) => !patch.hidden).length,
      iconUrl: index.bundle?.icon_url ?? index.bundle?.iconUrl ?? null,
      metadataStatus: 'verified',
      releases: (index.releases ?? []).slice(0, 20).map(({ version, created_at, description, prerelease }) => ({
        version, createdAt: created_at, description: description ?? '', prerelease: Boolean(prerelease),
      })),
      patches: patchesFromIndex({ releases: [release] }, sourceName, sourceName, manualSource.sourceUrl),
    })

    // A successful direct fetch supersedes any stale registry-fetch warning for this same source.
    for (let i = staleSources.length - 1; i >= 0; i--) {
      if (normalizeSourceUrl(staleSources[i].url) === normalizeSourceUrl(manualSource.sourceUrl)) staleSources.splice(i, 1)
    }
  } catch (error) {
    const alreadyLoaded = community.some((item) => normalizeSourceUrl(item.indexUrl) === normalizeSourceUrl(manualSource.sourceUrl))
    if (!alreadyLoaded) {
      const old = (previous.community ?? []).find((item) => normalizeSourceUrl(item.indexUrl) === normalizeSourceUrl(manualSource.sourceUrl))
      if (old) community.push(old)
      staleSources.push({ name: manualSource.name, url: manualSource.sourceUrl, error: error.message })
    }
  }
}

const sources = [
  { ...official, isOfficial: true, iconUrl: null },
  ...community.map((source) => ({ ...source, isOfficial: false })),
]
const patchByApp = new Map()
for (const source of sources) for (const patch of source.patches) for (const app of patch.apps) {
  if (!patchByApp.has(app.package)) patchByApp.set(app.package, [])
  patchByApp.get(app.package).push({ ...patch, sourceName: source.name, sourceUrl: source.indexUrl, sourceVersion: source.version, official: source.isOfficial })
}

const appMetadata = new Map(apiApps.map((app) => [app.package_name, app]))
const appCategory = (name, packageName) => {
  const text = `${name} ${packageName}`.toLowerCase()
  if (/youtube|video|tiktok|picsart|vlog|photo/.test(text)) return 'Video & Photography'
  if (/discord|telegram|reddit|instagram|twitter|whatsapp|social/.test(text)) return 'Social'
  if (/map|route|travel|alltrails/.test(text)) return 'Travel & Local'
  if (/music|scrobble/.test(text)) return 'Music & Audio'
  if (/weather|accu/.test(text)) return 'Weather'
  if (/gym|yazio|health|fitness/.test(text)) return 'Health & Fitness'
  if (/launcher|widget|adguard|cloudflare|warp|browser/.test(text)) return 'Tools'
  if (/pay|price|tracker/.test(text)) return 'Finance & Shopping'
  return 'Other'
}
const apps = [...patchByApp.entries()].map(([packageName, patches]) => {
  const metadata = appMetadata.get(packageName)
  const name = metadata?.app_name && metadata.app_name !== packageName ? metadata.app_name : packageName
  const uniquePatches = [...new Map(patches.map((patch) => [`${patch.bundle}:${patch.id}`, patch])).values()]
  const versions = [...new Set(patches.flatMap((patch) => patch.apps.find((app) => app.package === packageName)?.versions ?? []))]
  return { packageName, name, iconUrl: metadata?.icon_url ?? null, category: appCategory(name, packageName), patchCount: uniquePatches.length, bundleCount: new Set(uniquePatches.map((patch) => patch.bundle)).size, versions, patches: uniquePatches }
}).sort((a, b) => a.name.localeCompare(b.name))

const whatsNew = sources.flatMap((source) => source.releases.map((release) => ({ ...release, sourceName: source.name, sourceUrl: source.indexUrl, official: source.isOfficial }))).sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0)).slice(0, 30)

const catalogJson = `${JSON.stringify({ generatedAt: new Date().toISOString(), registry: { url: registryApi, generation: null, available: apiOk }, official, community, bundles: sources.map((source) => ({ name: source.name, author: source.author, description: source.description, homepage: source.homepage, indexUrl: source.indexUrl, addUrl: source.addUrl ?? addToReseamUrl(source.indexUrl, source.isOfficial), version: source.version, updatedAt: source.updatedAt, patchCount: source.patches.length, iconUrl: source.iconUrl, isOfficial: source.isOfficial, metadataStatus: source.metadataStatus ?? 'verified' })), apps, whatsNew, staleSources }, null, 2)}\n`
await writeFile(outputPath, catalogJson)
await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(new URL('../public/catalog.json', import.meta.url), catalogJson)
console.log(`Catalog updated: ${apps.length} apps, ${sources.length} bundles, ${apps.reduce((sum, app) => sum + app.patchCount, 0)} latest-release app patches, ${staleSources.length} stale sources.`)
