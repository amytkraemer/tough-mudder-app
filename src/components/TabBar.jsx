const TABS = [
  { key: 'today', label: 'Today', icon: TodayIcon },
  { key: 'plan', label: 'Plan', icon: PlanIcon },
  { key: 'exercises', label: 'Moves', icon: ExIcon },
  { key: 'grip', label: 'Grip', icon: GripIcon },
  { key: 'progress', label: 'Progress', icon: ProgressIcon },
]

export default function TabBar({ tab, setTab }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-bog/95 backdrop-blur no-tap-highlight"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto max-w-[760px] grid grid-cols-5">
        {TABS.map((t) => {
          const active = tab === t.key
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex flex-col items-center gap-1 py-2.5"
              aria-current={active ? 'page' : undefined}
            >
              <Icon active={active} />
              <span
                className={`font-display uppercase text-[.72rem] tracking-wide leading-none ${
                  active ? 'text-blaze' : 'text-ash'
                }`}
              >
                {t.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function base(active) {
  return { width: 24, height: 24, fill: 'none', stroke: active ? '#F2A33C' : '#9DAA9F', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
}
function TodayIcon({ active }) {
  return (<svg {...base(active)} viewBox="0 0 24 24"><path d="M12 3v9l5 3" /><circle cx="12" cy="12" r="9" /></svg>)
}
function PlanIcon({ active }) {
  return (<svg {...base(active)} viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="0" /></svg>)
}
function ExIcon({ active }) {
  return (<svg {...base(active)} viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M4 9l-1.5-1.5M20 15l1.5 1.5" /><rect x="3" y="9" width="4" height="6" rx="1" /><rect x="17" y="9" width="4" height="6" rx="1" /></svg>)
}
function GripIcon({ active }) {
  return (<svg {...base(active)} viewBox="0 0 24 24"><path d="M4 6h16" /><path d="M8 6v5a4 4 0 008 0V6" /></svg>)
}
function ProgressIcon({ active }) {
  return (<svg {...base(active)} viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 7-7" /><path d="M17 8h4v4" /></svg>)
}
