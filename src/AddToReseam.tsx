import { ArrowUpRight, Smartphone } from 'lucide-react'

export function AddToReseam({ url, compact = false }: { url: string | null; compact?: boolean }) {
  if (!url) return null
  const addPage = `https://reseam.app/add/?url=${encodeURIComponent(url)}`
  return <a className={`action-button add-reseam-button${compact ? ' compact' : ''}`} href={addPage} target="_blank" rel="noreferrer" title="Open Reseam’s Add patch source page">
    <Smartphone size={14}/>{compact ? 'Add' : 'Add to Reseam'}<ArrowUpRight size={12}/>
  </a>
}
