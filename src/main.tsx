import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowLeft, ArrowUpRight, ChevronDown, ExternalLink, Github, Grid2X2, Layers3, ListFilter, PackageOpen, Search, Sparkles, Copy, Bug, RefreshCw } from 'lucide-react'
import { AppCard } from './AppCard'
import { AddToReseam } from './AddToReseam'
import './style.css'

type AppInfo = { packageName: string; name: string; iconUrl: string | null; category: string; patchCount: number; bundleCount: number; versions: string[]; googlePlayStatus?: 'available' | 'unavailable' | 'unknown'; googlePlayStatusSource?: string; googlePlayCheckedAt?: string | null; googlePlayEvidenceUrl?: string | null; googlePlayMarketsChecked?: string[]; patches: Patch[] }
type Patch = { id: string; name: string; description: string; bundle: string; sourceName: string; sourceUrl: string; sourceVersion: string; apps: { package: string; versions: string[] }[]; options: { key?: string; title?: string; description?: string; option_type?: string; required?: boolean; default_value?: { value?: string | number | boolean } }[]; official: boolean }
type Bundle = { name: string; author: string; description: string; homepage: string; indexUrl: string; addUrl: string | null; version: string; updatedAt: string | null; patchCount: number; iconUrl: string | null; isOfficial: boolean; metadataStatus: string }
type BundleSource = { name: string; indexUrl: string; patches: Omit<Patch, 'official'>[] }
type Update = { version: string; createdAt: string | null; description: string; prerelease: boolean; sourceName: string; sourceUrl: string; official: boolean }
type Issue = { name: string; url: string; error: string }
type CatalogData = { generatedAt: string; registry: { url: string; available: boolean }; official: BundleSource; community: BundleSource[]; apps: AppInfo[]; bundles: Bundle[]; whatsNew: Update[]; staleSources: Issue[] }
type TabKey = 'apps' | 'bundles' | 'news'

const latestVersion = (versions: string[]) => {
  if (!versions.length) return null
  return [...versions].sort((a, b) => {
    const aParts = a.match(/\d+/g)?.map(Number) ?? []
    const bParts = b.match(/\d+/g)?.map(Number) ?? []
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const difference = (bParts[i] ?? 0) - (aParts[i] ?? 0)
      if (difference) return difference
    }
    return a.localeCompare(b)
  })[0]
}

const withAllAppVersions = (data: CatalogData): CatalogData => {
  const versionsByPackage = new Map<string, Set<string>>()
  const allPatches = [data.official, ...data.community].flatMap((source) => source.patches)
  for (const patch of allPatches) {
    for (const app of patch.apps ?? []) {
      if (!app.package) continue
      const versions = versionsByPackage.get(app.package) ?? new Set<string>()
      for (const version of app.versions ?? []) {
        const cleaned = version.trim()
        if (cleaned) versions.add(cleaned)
      }
      versionsByPackage.set(app.package, versions)
    }
  }
  return {
    ...data,
    apps: data.apps.map((app) => {
      const versions = new Set(app.versions ?? [])
      for (const version of versionsByPackage.get(app.packageName) ?? []) versions.add(version)
      return { ...app, versions: [...versions].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })) }
    }),
  }
}

const iconLabel = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const bundleIcon = (bundle: Pick<Bundle, 'iconUrl' | 'isOfficial'>) => bundle.iconUrl ?? (bundle.isOfficial ? '/reseam.ico' : null)

function AppIcon({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(!src)
  return <div className="app-icon"><span className="app-fallback">{iconLabel(name)}</span>{src && !failed && <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)}/>}</div>
}

function PatchCard({ patch }: { patch: Patch }) {
 const appRows = patch.apps.map((app) => `${app.package}${app.versions.length ? ` · ${app.versions.join(', ')}` : ''}`)
 const versions = [...new Set(patch.apps.flatMap((app) => app.versions ?? []))]
 const body = `## Broken patch report\n\n- Patch: ${patch.name}\n- Patch ID: ${patch.id}\n- Source: ${patch.sourceName} (${patch.sourceUrl})\n- Source version: ${patch.sourceVersion || 'Unknown'}\n- App/package: ${appRows.join(', ') || 'Not specified'}\n- Installed app version: \n- Reseam version: \n\n## Error message\n\n\n## Steps to reproduce\n\n`
 const report = `https://github.com/rudrakshrajpurohit417-sketch/awesome-reseam/issues/new?title=${encodeURIComponent(`Broken patch: ${patch.name}`)}&body=${encodeURIComponent(body)}`
 const copy = async (value: string) => { try { await navigator.clipboard.writeText(value) } catch { window.prompt('Copy this value:', value) } }
 return <article className="patch-row"><div className="patch-row-heading"><span className="patch-symbol"><Layers3 size={15}/></span><div className="patch-name"><h3>{patch.name}</h3><span>{patch.official ? 'Official' : 'Community'} · {patch.sourceName} · {patch.sourceVersion || 'Version unknown'}</span></div></div><p>{patch.description || 'No description provided.'}</p><div className="patch-row-footer"><span>{appRows.join(' · ') || 'Any app'}{versions.length ? <span className="compatibility-note">Versions listed by source: {versions.join(', ')}</span> : <span className="compatibility-note unknown">App version compatibility not specified by source</span>}</span>{patch.options.length > 0 && <details className="patch-options"><summary>{patch.options.length} {patch.options.length === 1 ? 'option' : 'options'}</summary><div className="options-popover">{patch.options.map((option) => <div key={option.key ?? option.title}><strong>{option.title ?? option.key ?? 'Option'}{option.required ? ' · required' : ''}</strong>{option.description && <p>{option.description}</p>}{option.default_value?.value !== undefined && <small>Default: {String(option.default_value.value)}</small>}</div>)}</div></details>}</div><div className="patch-tools"><button onClick={() => void copy(patch.id)}><Copy size={13}/> Copy patch ID</button><button onClick={() => void copy(patch.sourceUrl)}><Copy size={13}/> Copy source URL</button><a href={report} target="_blank" rel="noreferrer"><Bug size={13}/> Report issue</a></div></article>
}

function BundleCard({ bundle, onOpen }: { bundle: Bundle; onOpen: () => void }) {
  const addSource = bundle.isOfficial ? bundle.indexUrl : bundle.homepage
  return <article className="bundle-card"><button className="bundle-open" onClick={onOpen} aria-label={`Browse ${bundle.name} patches`}><div className="bundle-card-head"><AppIcon src={bundleIcon(bundle)} name={bundle.name}/><span className={bundle.isOfficial ? 'bundle-tag official-tag' : 'bundle-tag'}>{bundle.isOfficial ? 'OFFICIAL' : 'COMMUNITY'}</span></div><h2>{bundle.name}</h2></button><p className="bundle-author">by {bundle.author}</p><p className="bundle-description">{bundle.description || 'A Reseam patch bundle from the community.'}</p><div className="bundle-stats"><span><Layers3 size={13}/>{bundle.patchCount} patches</span><span>v{bundle.version}</span></div><div className="bundle-card-footer"><span>Updated {formatDate(bundle.updatedAt)}</span><div className="bundle-actions"><AddToReseam url={addSource}/><a className="action-button source-button" href={bundle.homepage} target="_blank" rel="noreferrer">Source <ArrowUpRight size={14}/></a></div></div></article>
}

function releaseSummary(description: string) {
  const bullets = description.split('\n').map((line) => line.trim()).filter((line) => /^[-*]\s/.test(line)).map((line) => line.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').replace(/`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'))
  if (bullets.length) return bullets.slice(0, 3)
  const clean = description.replace(/[#*`]/g, '').trim()
  return clean ? [clean.slice(0, 180)] : ['Release published.']
}

function App() {
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [tab, setTab] = useState<TabKey>('apps')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('popular')
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null)
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null)
  const [filterMenu, setFilterMenu] = useState(false)
  const [sortMenu, setSortMenu] = useState(false)
  const [visibleAppCount, setVisibleAppCount] = useState(24)
  const [visiblePatchCount, setVisiblePatchCount] = useState(24)
  const [expandedAppBundles, setExpandedAppBundles] = useState<Set<string>>(() => new Set())
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const detailLoadMoreRef = useRef<HTMLDivElement>(null)
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())
  const writeRoute = (nextTab: TabKey, params: Record<string, string> = {}, detail = false, replace = false) => {
    const url = new URL(window.location.href)
    url.search = new URLSearchParams(params).toString()
    url.hash = nextTab === 'news' ? 'whats-new' : nextTab
    const href = `${url.pathname}${url.search}${url.hash}`
    const state = { awesomeReseam: true, detail }
    if (replace) window.history.replaceState(state, '', href)
    else window.history.pushState(state, '', href)
  }
  const switchTab = (next: TabKey) => { writeRoute(next); setTab(next); setSelectedApp(null); setSelectedBundle(null); setCategory('all'); setQuery(''); setSort('popular') }
  const openApp = (app: AppInfo) => { writeRoute('apps', { app: app.packageName }, true); setTab('apps'); setSelectedApp(app); setSelectedBundle(null); setQuery('') }
  const openBundle = (bundle: Bundle) => { writeRoute('bundles', { bundle: bundle.indexUrl }, true); setTab('bundles'); setSelectedBundle(bundle); setSelectedApp(null); setQuery('') }
  const backFromDetail = (nextTab: TabKey) => {
    if (window.history.state?.awesomeReseam && window.history.state?.detail) window.history.back()
    else switchTab(nextTab)
  }
  useEffect(() => { if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined) }, [])
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}catalog.json`).then((response) => { if (!response.ok) throw new Error('Catalog request failed'); return response.json() }).then((value: CatalogData) => setCatalogData(withAllAppVersions(value))).catch(() => import('../data/catalog.json').then((module) => setCatalogData(withAllAppVersions(module.default as CatalogData))).catch(() => setLoadError(true)))
  }, [])
  useEffect(() => {
    if (!catalogData) return
    const syncFromUrl = () => {
      const url = new URL(window.location.href)
      const appParam = url.searchParams.get('app')
      const bundleParam = url.searchParams.get('bundle')
      const app = appParam ? catalogData.apps.find((item) => item.packageName === appParam) ?? null : null
      const bundle = bundleParam ? catalogData.bundles.find((item) => item.indexUrl === bundleParam || item.name === bundleParam) ?? null : null
      const hash = url.hash.slice(1)
      const nextTab: TabKey = appParam ? 'apps' : bundleParam ? 'bundles' : hash === 'bundles' ? 'bundles' : hash === 'whats-new' || hash === 'news' ? 'news' : 'apps'
      if (!hash || hash === 'patches') writeRoute(nextTab, Object.fromEntries(url.searchParams.entries()), false, true)
      setTab(nextTab)
      setSelectedApp(nextTab === 'apps' ? app : null)
      setSelectedBundle(nextTab === 'bundles' ? bundle : null)
      setCategory('all')
      setQuery('')
      setFilterMenu(false)
    }
    syncFromUrl()
    window.addEventListener('popstate', syncFromUrl)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [catalogData])
  const data = catalogData ?? { generatedAt: '', registry: { url: '', available: false }, official: { name: '', indexUrl: '', patches: [] }, community: [], apps: [], bundles: [], whatsNew: [], staleSources: [] }
  const categories = useMemo(() => [...new Set(data.apps.map((app) => app.category))].sort(), [data.apps])
  const indexedApps = useMemo(() => data.apps.map((app) => ({ app, searchText: `${app.name} ${app.packageName} ${app.category} ${app.patches.map((patch) => `${patch.name} ${patch.description} ${patch.id} ${patch.sourceName} ${patch.sourceUrl} ${patch.sourceVersion} ${patch.apps.map((target) => `${target.package} ${target.versions.join(' ')}`).join(' ')} ${patch.options.map((option) => `${option.title ?? ''} ${option.key ?? ''} ${option.description ?? ''}`).join(' ')}`).join(' ')}`.toLowerCase() })), [data.apps])
  const indexedBundlePatches = useMemo(() => data.bundles.map((bundle) => {
    const source = bundle.isOfficial ? data.official : data.community.find((item) => item.indexUrl === bundle.indexUrl)
    return { bundle, patches: (source?.patches ?? []).map((sourcePatch) => {
      const patch: Patch = { ...sourcePatch, official: bundle.isOfficial }
      return { patch, searchText: `${patch.name} ${patch.description} ${patch.sourceName} ${patch.apps.map((app) => `${app.package} ${app.versions.join(' ')}`).join(' ')} ${patch.options.map((option) => `${option.title ?? ''} ${option.key ?? ''} ${option.description ?? ''}`).join(' ')}`.toLowerCase() }
    }) }
  }), [data.bundles, data.official, data.community])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector<HTMLInputElement>('.search-input')?.focus() }
      if (event.key === 'Escape') { setSelectedApp(null); setSelectedBundle(null); setQuery('') }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const visibleApps = useMemo(() => {
    const rows = indexedApps.filter(({ app, searchText }) => (category === 'all' || app.category === category) && searchText.includes(deferredQuery)).map(({ app }) => app)
    return rows.sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'patches-asc' ? a.patchCount - b.patchCount : b.patchCount - a.patchCount || a.name.localeCompare(b.name))
  }, [category, deferredQuery, sort, indexedApps])
  const visibleBundles = useMemo(() => {
    const rows = data.bundles.filter((bundle) => `${bundle.name} ${bundle.author} ${bundle.description}`.toLowerCase().includes(query.trim().toLowerCase()))
    return rows.sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'patches-asc' ? a.patchCount - b.patchCount : b.patchCount - a.patchCount)
  }, [query, sort, data.bundles])
  const appBundleGroups = useMemo(() => {
    if (!selectedApp) return []
    const grouped = new Map<string, { bundle: Bundle; patches: Patch[] }>()
    for (const patch of selectedApp.patches) {
      const bundle = data.bundles.find((item) => item.name === patch.bundle || item.indexUrl === patch.sourceUrl)
      const key = bundle?.indexUrl ?? patch.sourceUrl
      const current = grouped.get(key) ?? { bundle: bundle ?? { name: patch.sourceName, author: patch.sourceName, description: '', homepage: patch.sourceUrl, indexUrl: patch.sourceUrl, addUrl: null, version: patch.sourceVersion, updatedAt: null, patchCount: 0, iconUrl: null, isOfficial: patch.official, metadataStatus: 'unknown' }, patches: [] }
      current.patches.push(patch)
      grouped.set(key, current)
    }
    return [...grouped.values()].map((group) => ({ ...group, patches: group.patches.sort((a, b) => a.name.localeCompare(b.name)) })).sort((a, b) => Number(b.bundle.isOfficial) - Number(a.bundle.isOfficial) || a.bundle.name.localeCompare(b.bundle.name))
  }, [selectedApp, data.bundles])
  const visibleUpdates = useMemo(() => data.whatsNew.filter((item) => `${item.sourceName} ${item.version} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => sort === 'oldest' ? new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime() : new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()), [query, sort, data.whatsNew])
  const detailPatches = useMemo(() => {
    if (selectedBundle) {
      const indexed = indexedBundlePatches.find(({ bundle }) => bundle.indexUrl === selectedBundle.indexUrl)?.patches ?? []
      return (deferredQuery ? indexed.filter(({ searchText }) => searchText.includes(deferredQuery)) : indexed).map(({ patch }) => patch).sort((a, b) => a.name.localeCompare(b.name))
    }
    const patches = selectedApp?.patches ?? []
    return deferredQuery ? patches.filter((patch) => `${patch.name} ${patch.description} ${patch.sourceName} ${patch.apps.map((app) => `${app.package} ${app.versions.join(' ')}`).join(' ')} ${patch.options.map((option) => `${option.title ?? ''} ${option.key ?? ''} ${option.description ?? ''}`).join(' ')}`.toLowerCase().includes(deferredQuery)) : patches
  }, [selectedApp, selectedBundle, indexedBundlePatches, deferredQuery])
  const visibleAppGroups = useMemo(() => {
    return appBundleGroups.map((group) => {
      const matching = group.patches.filter((patch) => detailPatches.includes(patch))
      return { ...group, patches: matching, matchingCount: matching.length }
    }).filter((group) => group.matchingCount > 0)
  }, [appBundleGroups, detailPatches])
  const activeCount = tab === 'apps' ? (selectedApp ? detailPatches.length : visibleApps.length) : tab === 'bundles' ? (selectedBundle ? detailPatches.length : visibleBundles.length) : visibleUpdates.length
  const totalPatches = data.bundles.reduce((sum, bundle) => sum + bundle.patchCount, 0)
  const countLabel = selectedApp || selectedBundle ? 'Patches' : tab === 'apps' ? 'Apps' : tab === 'bundles' ? 'Bundles' : 'Updates'
  const searchPlaceholder = tab === 'apps' ? selectedApp ? 'Filter this app’s patches…' : 'Search apps or patches…' : tab === 'bundles' ? selectedBundle ? 'Filter this bundle’s patches…' : 'Search bundles…' : 'Search release notes…'

  useEffect(() => { setVisibleAppCount(24) }, [category, deferredQuery, sort, tab])
  useEffect(() => { setVisiblePatchCount(24) }, [selectedApp, selectedBundle, deferredQuery])
  useEffect(() => {
    if (!selectedApp && !selectedBundle) return
    // Detail views should always open at the page header, not retain the catalog's scroll position.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [selectedApp, selectedBundle])
  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel || tab !== 'apps' || selectedApp || visibleAppCount >= visibleApps.length) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setVisibleAppCount((count) => Math.min(count + 24, visibleApps.length))
    }, { rootMargin: '400px 0px', threshold: 0 })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [tab, selectedApp, visibleAppCount, visibleApps.length])
  useEffect(() => {
    const sentinel = detailLoadMoreRef.current
    if (!sentinel || (!selectedApp && !selectedBundle) || visiblePatchCount >= detailPatches.length) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setVisiblePatchCount((count) => Math.min(count + 24, detailPatches.length))
    }, { rootMargin: '400px 0px', threshold: 0 })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [selectedApp, selectedBundle, visiblePatchCount, detailPatches.length])

  if (!catalogData) return loadError ? <div className="loading-state">Catalog data could not be loaded. Please refresh the page.</div> : <div className="startup-shell" role="status" aria-label="Loading Awesome Reseam"><div className="startup-header"><span className="startup-logo"></span><span className="startup-brand"><i></i><b></b></span></div><div className="startup-content"><span className="startup-tabs"></span><span className="startup-search"></span><div className="startup-grid">{Array.from({ length: 6 }, (_, index) => <i key={index}/>)}</div></div></div>

  return <div className="site-shell">
    <header className="site-header"><a href="#catalog" className="brand"><span className="brand-icon"><img src="/reseam.ico" alt=""/></span><span><strong>Awesome</strong> Reseam<small>Explore community patches for Reseam</small></span></a><div className="header-actions"><a className="request-bundle-button" href={`https://github.com/${"rudrakshrajpurohit417-sketch/awesome-reseam"}/issues/new?title=${encodeURIComponent("Bundle request")}&body=${encodeURIComponent("## Bundle name\n\n## Bundle repository/source URL\n\n## Bundle index URL (if available)\n\n## Why should this bundle be added?\n\n")}`} target="_blank" rel="noreferrer" >Request Bundle</a><a href="https://reseam.app/patches/" target="_blank" rel="noreferrer">Official patches <ExternalLink size={13}/></a><a className="github-button" href="https://github.com/rudrakshrajpurohit417-sketch/awesome-reseam" target="_blank" rel="noreferrer" aria-label="Awesome Reseam on GitHub"><Github size={17}/></a></div></header>
    <main id="catalog" className="catalog-page">
      <section className="catalog-toolbar" aria-label="Catalog controls"><div className="toolbar-main"><div className="tabs" data-active-tab={tab} role="tablist" aria-label="Catalog type"><span className="tabs-indicator" aria-hidden="true" /><button role="tab" aria-selected={tab === 'apps'} className={tab === 'apps' ? 'active' : ''} onClick={() => switchTab('apps')}><Grid2X2 size={15}/>Apps</button><button role="tab" aria-selected={tab === 'bundles'} className={tab === 'bundles' ? 'active' : ''} onClick={() => switchTab('bundles')}><Layers3 size={16}/>Bundles</button><button role="tab" aria-selected={tab === 'news'} className={tab === 'news' ? 'active' : ''} onClick={() => switchTab('news')}><Sparkles size={15}/>What’s New</button></div>
        <div className="sort-control"><button className="select-box sort-button" onClick={() => { setSortMenu((open) => !open); setFilterMenu(false) }} aria-expanded={sortMenu} aria-haspopup="listbox"><ListFilter size={16}/>{tab === 'news' ? (sort === 'oldest' ? 'Oldest releases' : 'Newest releases') : sort === 'name' ? 'Name A–Z' : sort === 'patches-asc' ? 'Fewest patches' : 'Most patches'}<ChevronDown size={15}/></button>{sortMenu && <div className="category-menu sort-menu" role="listbox" aria-label="Sort catalog">{(tab === 'news' ? [{value:'popular',label:'Newest releases'},{value:'oldest',label:'Oldest releases'}] : [{value:'popular',label:'Most patches'},{value:'name',label:'Name A–Z'},{value:'patches-asc',label:'Fewest patches'}]).map((option) => <button key={option.value} role="option" aria-selected={sort === option.value} className={sort === option.value ? 'selected' : ''} onClick={() => { setSort(option.value); setSortMenu(false) }}>{option.label}{sort === option.value && <span>✓</span>}</button>)}</div>}</div>
        {tab === 'apps' ? <div className="category-control"><button className="select-box category-button" onClick={() => setFilterMenu(!filterMenu)} aria-expanded={filterMenu}><ListFilter size={16}/>{category === 'all' ? 'All categories' : category}<ChevronDown size={15}/></button>{filterMenu && <div className="category-menu"><button className={category === 'all' ? 'selected' : ''} onClick={() => { setCategory('all'); setFilterMenu(false) }}>All categories <span>{data.apps.length}</span></button>{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => { setCategory(item); setFilterMenu(false) }}>{item}<span>{data.apps.filter((app) => app.category === item).length}</span></button>)}</div>}</div> : <div className="category-spacer" aria-hidden="true"/>}
        <label className="search-box"><Search size={17}/><input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder}/><kbd>⌘ K</kbd></label><span className="total-count">{activeCount.toLocaleString()} {countLabel}</span></div>
      </section>

      {data.staleSources.length > 0 && <div className="stale-banner"><RefreshCw size={15}/> Some catalog sources could not refresh. Showing the last saved data. <details><summary>Details</summary>{data.staleSources.map((issue) => <span key={issue.url}>{issue.name}: {issue.error}</span>)}</details></div>}

      {tab === 'apps' && !selectedApp && <section className="catalog-results"><div className="result-context"><span>PATCHABLE APPS</span><span>{data.apps.length} apps · {totalPatches} patches in latest bundles</span></div>{visibleApps.length ? <><div className="app-grid">{visibleApps.slice(0, visibleAppCount).map((app) => <AppCard app={app} key={app.packageName} onOpen={() => openApp(app)}/>)}</div>{visibleAppCount < visibleApps.length && <div ref={loadMoreRef} className="load-more-sentinel" aria-label="Loading more apps"/>}</> : <Empty message="No apps match your search."/>}</section>}

      {tab === 'apps' && selectedApp && <section className="detail-view"><button className="back-button" onClick={() => backFromDetail('apps')}><ArrowLeft size={15}/> All apps</button><div className="app-detail-head"><AppIcon src={selectedApp.iconUrl} name={selectedApp.name}/><div><h1>{selectedApp.name}</h1><code>{selectedApp.packageName}</code><p>{detailPatches.length} patches · {appBundleGroups.length} {appBundleGroups.length === 1 ? 'bundle' : 'bundles'}{latestVersion(selectedApp.versions) ? ` · Version ${latestVersion(selectedApp.versions)}` : ' · Latest version'}</p></div><span className="category-chip">{selectedApp.category}</span></div><div className="detail-toolbar"><h2>Bundles and patches</h2></div>{detailPatches.length ? <><div className="app-bundle-list">{visibleAppGroups.map((group) => <section className="app-bundle-group" key={group.bundle.indexUrl}><header className="app-bundle-heading"><div className="app-bundle-title"><AppIcon src={bundleIcon(group.bundle)} name={group.bundle.name}/><div><h3>{group.bundle.name}</h3><p>{group.bundle.author} · v{group.bundle.version} · {group.matchingCount} patches</p></div></div><div className="app-bundle-actions"><AddToReseam url={group.bundle.isOfficial ? group.bundle.indexUrl : group.bundle.homepage} compact/><a className="patch-link" href={group.bundle.homepage} target="_blank" rel="noreferrer" aria-label={`Open ${group.bundle.name} publisher source`}><ArrowUpRight size={15}/></a></div></header><div className="patch-list">{(deferredQuery || expandedAppBundles.has(group.bundle.indexUrl) ? group.patches : group.patches.slice(0, 2)).map((patch) => <PatchCard patch={patch} key={`${patch.bundle}:${patch.id}`}/>)}</div>{group.matchingCount > 2 && <button className="show-patches-button" onClick={() => setExpandedAppBundles((current) => { const next = new Set(current); if (next.has(group.bundle.indexUrl)) next.delete(group.bundle.indexUrl); else next.add(group.bundle.indexUrl); return next })}>{expandedAppBundles.has(group.bundle.indexUrl) ? 'Show fewer' : `Show all ${group.matchingCount} patches`}</button>}</section>)}</div></> : <Empty message="No patches match your search."/>}</section>}

      {tab === 'bundles' && !selectedBundle && <section className="catalog-results"><div className="result-context"><span>PATCH SOURCES</span><span>{data.bundles.length} active sources</span></div>{visibleBundles.length ? <div className="bundle-grid">{visibleBundles.map((bundle) => <BundleCard bundle={bundle} key={bundle.indexUrl} onOpen={() => openBundle(bundle)}/>)}</div> : <Empty message="No bundles match your search."/>}</section>}

      {tab === 'bundles' && selectedBundle && <section className="detail-view"><button className="back-button" onClick={() => backFromDetail('bundles')}><ArrowLeft size={15}/> All bundles</button><div className="app-detail-head"><AppIcon src={bundleIcon(selectedBundle)} name={selectedBundle.name}/><div><h1>{selectedBundle.name}</h1><code>by {selectedBundle.author}</code><p>{detailPatches.length} patches · version {selectedBundle.version} · {selectedBundle.isOfficial ? 'Official' : 'Community'} source</p></div><div className="detail-actions"><AddToReseam url={selectedBundle.isOfficial ? selectedBundle.indexUrl : selectedBundle.homepage}/><a className="action-button" href={selectedBundle.homepage} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={14}/></a></div></div><div className="detail-toolbar"><h2>Bundle patches</h2></div>{detailPatches.length ? <><div className="patch-list">{detailPatches.slice(0, visiblePatchCount).map((patch) => <PatchCard patch={patch} key={`${patch.bundle}:${patch.id}`}/>)}</div>{visiblePatchCount < detailPatches.length && <div ref={detailLoadMoreRef} className="load-more-sentinel" aria-label="Loading more patches"/>}</> : <Empty message="No patches are available for this bundle."/>}</section>}

      {tab === 'news' && <section className="catalog-results"><div className="result-context"><span>RECENT RELEASES</span><span>Official and community bundle updates</span></div>{visibleUpdates.length ? <div className="updates-list">{visibleUpdates.map((item, index) => <article className="update-card" key={`${item.sourceUrl}:${item.version}:${index}`}><div className="update-date">{formatDate(item.createdAt)}</div><div className="update-main"><div className="update-meta"><span className={item.official ? 'bundle-tag official-tag' : 'bundle-tag'}>{item.official ? 'OFFICIAL' : 'COMMUNITY'}</span><span>{item.sourceName}</span>{item.prerelease && <span className="pre-tag">PRE-RELEASE</span>}</div><h2>Version {item.version}</h2><ul>{releaseSummary(item.description).map((line, lineIndex) => <li key={lineIndex}>{line}</li>)}</ul></div><a href={item.sourceUrl} target="_blank" rel="noreferrer" className="patch-link" aria-label="Open release source"><ArrowUpRight size={16}/></a></article>)}</div> : <Empty message="No release notes match your search."/>}</section>}
      <footer className="site-footer"><div className="footer-brand"><span className="brand-icon"><img src="/reseam.ico" alt=""/></span> Awesome Reseam</div><span>Community maintained · Not affiliated with Reseam</span><div><a href="https://patch-bundles.jmancentral.com/" target="_blank" rel="noreferrer">Catalog data <ArrowUpRight size={12}/></a><a href="https://reseam.app/docs/authoring/publishing/" target="_blank" rel="noreferrer">Publish a bundle <ArrowUpRight size={12}/></a><a href="https://github.com/rudrakshrajpurohit417-sketch/awesome-reseam" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={12}/></a></div></footer>
    </main>
  </div>
}

function Empty({ message }: { message: string }) { return <div className="empty-state"><PackageOpen size={23}/><p>{message}</p></div> }

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)

