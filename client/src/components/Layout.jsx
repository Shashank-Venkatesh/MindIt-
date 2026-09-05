import { NavLink, Outlet } from "react-router-dom";
import { Icon } from "./ui";
import { useAuth } from "../context/useAuth";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/about", label: "About" },
];

export function Layout() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <span className="text-2xl font-bold tracking-tight text-on-surface">
            MindIt<span className="text-primary">!</span>
          </span>

          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1 rounded-lg border border-border bg-surface-alt p-1">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? "bg-primary text-on-primary"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              {isAuthenticated ? (
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? "bg-primary text-on-primary"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`
                  }
                >
                  Profile
                </NavLink>
              ) : null}
            </nav>

            {!isAuthenticated ? (
              <NavLink
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface"
              >
                <Icon name="login" className="text-[15px]" />
                <span className="hidden sm:inline">Log in</span>
              </NavLink>
            ) : null}
          </div>
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
  );
}
