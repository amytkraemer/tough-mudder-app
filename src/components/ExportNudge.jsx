import { downloadBackup } from '../lib/storage.js'

// Prompt to export once a month. That export is the only backup.
function daysSince(iso) {
  if (!iso) return Infinity
  return (Date.now() - new Date(iso).getTime()) / 86400000
}

export default function ExportNudge({ data, update }) {
  const last = data.settings.lastExportPrompt
  const created = data.settings.createdAt
  const due = daysSince(last) >= 30 && daysSince(created) >= 30
  if (!due) return null

  const exportNow = () => {
    downloadBackup(data)
    update((d) => { d.settings.lastExportPrompt = new Date().toISOString(); return d })
  }
  const remind = () => {
    // snooze ~a week by backdating the prompt marker
    update((d) => { d.settings.lastExportPrompt = new Date(Date.now() - 23 * 86400000).toISOString(); return d })
  }

  return (
    <div className="fixed left-0 right-0 z-40 px-4" style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}>
      <div className="mx-auto max-w-[720px] bg-surface-2 border border-blaze rounded p-3 shadow-lg flex items-center gap-3">
        <div className="flex-1">
          <p className="font-cond font-bold uppercase text-[.66rem] tracking-wider text-blaze">Monthly backup</p>
          <p className="text-[.8rem] text-bone-dim">Your data lives only on this device. Export it — that file is your only backup.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <button onClick={exportNow} className="px-3 py-2 rounded bg-blaze text-bog font-cond font-bold uppercase text-[.7rem] tracking-wide">Export</button>
          <button onClick={remind} className="px-3 py-1 text-bone-dim text-[.7rem]">Later</button>
        </div>
      </div>
    </div>
  )
}
