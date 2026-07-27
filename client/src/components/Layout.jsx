import { NavLink, Outlet } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/about', label: 'About' },
]

export function Layout() {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-base font-bold tracking-tight text-on-surface">
            MindIt<span className="text-primary">!</span>
          </span>

          <nav className="flex items-center gap-1 rounded-lg border border-border bg-surface-alt p-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                    isActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-border px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl text-center text-xs text-on-surface-variant">
          Grounded summaries and mind maps, generated in your session only.
        </div>
      </footer>
    </div>
  )
}
