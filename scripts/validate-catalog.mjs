import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const dataCatalog = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'))
const publicCatalog = JSON.parse(await readFile(new URL('../public/catalog.json', import.meta.url), 'utf8'))

assert.deepEqual(publicCatalog, dataCatalog, 'public/catalog.json must match data/catalog.json')
assert.ok(dataCatalog.registry && typeof dataCatalog.registry.available === 'boolean', 'Catalog registry availability must be explicit')
assert.ok(dataCatalog.official && Array.isArray(dataCatalog.official.patches) && dataCatalog.official.patches.length > 0, 'Official bundle must contain patches')
assert.ok(Array.isArray(dataCatalog.community), 'Community sources must be an array')
assert.ok(Array.isArray(dataCatalog.bundles) && dataCatalog.bundles.length > 0, 'At least one bundle must be present')
assert.ok(Array.isArray(dataCatalog.apps) && dataCatalog.apps.length > 0, 'At least one app must be present')
assert.ok(Array.isArray(dataCatalog.staleSources), 'staleSources must be an array')

const packages = new Set()
for (const app of dataCatalog.apps) {
  assert.ok(app.packageName && typeof app.packageName === 'string', 'Every app must have a package name')
  assert.ok(!packages.has(app.packageName), `Duplicate app package: ${app.packageName}`)
  packages.add(app.packageName)
  assert.ok(['available', 'unavailable', 'unknown'].includes(app.googlePlayStatus), `${app.packageName}: invalid Google Play status`)
  assert.ok(['manual', 'google-play', 'unknown'].includes(app.googlePlayStatusSource), `${app.packageName}: invalid Google Play status source`)
  assert.ok(app.googlePlayCheckedAt === null || typeof app.googlePlayCheckedAt === 'string', `${app.packageName}: Google Play check timestamp must be a string or null`)
  assert.ok(Array.isArray(app.googlePlayMarketsChecked), `${app.packageName}: markets checked must be an array`)
  if (app.googlePlayStatusSource === 'manual' && app.googlePlayStatus === 'unavailable') {
    assert.ok(/^https:\/\//.test(app.googlePlayEvidenceUrl ?? ''), `${app.packageName}: manual unavailable status needs an evidence URL`)
  }
  assert.ok(Array.isArray(app.patches), `${app.packageName}: patches must be an array`)
  assert.equal(app.patchCount, app.patches.length, `${app.packageName}: patchCount does not match patches`)
}

const sourceUrls = new Set()
const patchKeys = new Set()
const sources = [{ ...dataCatalog.official, isOfficial: true }, ...dataCatalog.community.map(source => ({ ...source, isOfficial: false }))]
for (const source of sources) {
  assert.ok(source.name, 'Every source needs a name')
  assert.ok(/^https:\/\//.test(source.indexUrl ?? ''), `${source.name}: indexUrl must be HTTPS`)
  assert.ok(Array.isArray(source.patches), `${source.name}: patches must be an array`)
  assert.ok(!sourceUrls.has(source.indexUrl), `Duplicate source index URL: ${source.indexUrl}`)
  sourceUrls.add(source.indexUrl)
  for (const patch of source.patches) {
    assert.ok(patch.id && patch.name, `${source.name}: every patch needs an ID and a name`)
    const key = `${source.indexUrl}:${patch.id}`
    assert.ok(!patchKeys.has(key), `Duplicate patch ID within source: ${key}`)
    patchKeys.add(key)
    assert.ok(Array.isArray(patch.apps), `${source.name}/${patch.name}: apps must be an array`)
    for (const app of patch.apps) {
      assert.ok(app.package && typeof app.package === 'string', `${source.name}/${patch.name}: app compatibility needs a package`)
      assert.ok(Array.isArray(app.versions), `${source.name}/${patch.name}: versions must be an array`)
    }
  }
}

const unknown = dataCatalog.apps.filter(app => app.googlePlayStatus === 'unknown').length
const unavailable = dataCatalog.apps.filter(app => app.googlePlayStatus === 'unavailable').length
const available = dataCatalog.apps.filter(app => app.googlePlayStatus === 'available').length
console.log(`Catalog valid: ${dataCatalog.bundles.length} bundles, ${dataCatalog.apps.length} apps, ${patchKeys.size} source patches; Google Play: ${available} available, ${unavailable} unavailable, ${unknown} needs manual review.`)
if (dataCatalog.staleSources.length) {
  console.warn(`Catalog contains ${dataCatalog.staleSources.length} stale source(s); review before publishing source-data changes.`)
}
