import assert from 'node:assert/strict'

const baseUrl = (process.env.SMOKE_BASE_URL ?? 'https://awesome-reseam.vercel.app').replace(/\/+$/, '')
const request = async (url) => fetch(url, {
  headers: { 'user-agent': 'AwesomeReseamProductionSmoke/1.0' },
  signal: AbortSignal.timeout(15000),
})

const pageResponse = await request(baseUrl)
assert.equal(pageResponse.status, 200, `Production home page returned HTTP ${pageResponse.status}`)
const html = await pageResponse.text()
assert.match(html, /<html[\s>]/i, 'Home page did not return HTML')

const assetRefs = new Set([
  ...[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js(?:\?[^"']*)?)["'][^>]*>/gi)].map(match => match[1]),
  ...[...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi)].map(match => match[1]),
])
assert.ok(assetRefs.size > 0, 'No JavaScript or CSS assets were found in the home page HTML')

for (const ref of assetRefs) {
  const assetUrl = new URL(ref, `${baseUrl}/`).href
  const response = await request(assetUrl)
  assert.equal(response.status, 200, `Static asset failed: ${assetUrl} (HTTP ${response.status})`)
}

const catalogUrl = new URL('catalog.json', `${baseUrl}/`).href
const catalogResponse = await request(catalogUrl)
assert.equal(catalogResponse.status, 200, `Catalog returned HTTP ${catalogResponse.status}`)
const catalog = await catalogResponse.json()
assert.ok(Array.isArray(catalog.apps) && catalog.apps.length > 0, 'Catalog has no apps')
assert.ok(Array.isArray(catalog.bundles) && catalog.bundles.length > 0, 'Catalog has no bundles')
assert.ok(catalog.official?.patches?.length > 0, 'Catalog has no official patches')
assert.ok(Array.isArray(catalog.staleSources), 'Catalog is missing stale-source health metadata')
for (const app of catalog.apps) {
  assert.ok(['available', 'unavailable', 'unknown'].includes(app.googlePlayStatus), `${app.packageName}: Google Play status missing or invalid`)
}
const staleCount = catalog.staleSources.length
const unknownCount = catalog.apps.filter(app => app.googlePlayStatus === 'unknown').length
console.log(`Production smoke test passed: home 200, ${assetRefs.size} static assets 200, ${catalog.apps.length} apps, ${catalog.bundles.length} bundles. Google Play status unknown for ${unknownCount} app(s); stale sources: ${staleCount}.`)
