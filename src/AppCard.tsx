/*
 * Adapted from AppCard.tsx in nvbangg/awesome-morphe.
 * Copyright (c) 2026 nvbangg. Used under the MIT License; see
 * LICENSE.awesome-morphe. Reseam-specific data and styling are adapted here.
 */
import { memo, useState } from 'react'
import { ArrowUpRight, Check, Copy, Layers3 } from 'lucide-react'

export type AppCardData = {
  packageName: string
  name: string
  iconUrl: string | null
  category: string
  patchCount: number
  versions: string[]
}

function latestVersion(versions: string[]) {
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

function AppIcon({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(!src)
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
  return <div className="app-icon"><span className="app-fallback">{initials}</span>{src && !failed && <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />}</div>
}

export const AppCard = memo(function AppCard({ app, onOpen }: { app: AppCardData; onOpen: () => void }) {
  const [copied, setCopied] = useState(false)
  const copyPackage = async (event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(app.packageName)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch { /* Clipboard access may be unavailable on non-secure origins. */ }
  }
  return <article className="app-card">
    <button className="app-card-overlay" onClick={onOpen} aria-label={`Open ${app.name} patch bundles`} />
    <button className="app-open" onClick={onOpen} aria-label={`Browse ${app.name} patches`}>
      <AppIcon src={app.iconUrl} name={app.name} />
      <div className="app-title-block"><h2>{app.name}</h2><span className="patch-count"><Layers3 size={12} />{app.patchCount} {app.patchCount === 1 ? 'patch' : 'patches'}</span><span className="app-version">{latestVersion(app.versions) ? `Version ${latestVersion(app.versions)}` : 'Latest version'}</span></div>
    </button>
    <button className="package-id" onClick={copyPackage} title="Copy package name"><span>{copied ? <Check size={13} /> : <Copy size={13} />}</span><code>{app.packageName}</code>{copied && <em>Copied</em>}</button>
    <p className="app-description">Browse community patches for {app.name} and compare supported versions.</p>
    <div className="app-card-footer"><span className="category-chip">{app.category}</span><a className="action-button" href={`https://play.google.com/store/apps/details?id=${encodeURIComponent(app.packageName)}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Google Play <ArrowUpRight size={14} /></a></div>
  </article>
})
