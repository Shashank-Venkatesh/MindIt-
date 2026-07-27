export function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function TabBar({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface-alt p-1">
      {options.map((option) => {
        const isActive = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
              isActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Panel({ title, subtitle, actions, children }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-on-surface">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}
