import { createContext, useContext, useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { Bookmark, House, Menu, Moon, Search, Sun } from "lucide-react";
import { useSavedVideos } from "@/hooks/use-saved";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

// ---- theme (default: dark, like YouTube) ----
const ThemeContext = createContext<{ dark: boolean; toggle: () => void }>({ dark: true, toggle: () => {} });

function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>{children}</ThemeContext.Provider>
  );
}

// ---- logo ----
function Logo() {
  return (
    <Link href="/" className="flex items-center gap-1.5 shrink-0" aria-label="VidVault home">
      <svg width="30" height="21" viewBox="0 0 30 21" aria-hidden>
        <rect width="30" height="21" rx="6" fill="#ff1f2e" />
        <path d="M12 6.5l7.5 4L12 14.5z" fill="#fff" />
      </svg>
      <span className="text-lg font-bold tracking-tight">
        Vid<span className="text-primary">Vault</span>
      </span>
    </Link>
  );
}

// ---- header ----
function Header({ onMenu }: { onMenu: () => void }) {
  const { dark, toggle } = useContext(ThemeContext);
  const [location, navigate] = useLocation();
  const [q, setQ] = useState("");
  const { data: saved } = useSavedVideos();

  // sync input when arriving on a search page
  useEffect(() => {
    const m = location.match(/[?&]q=([^&]*)/);
    if (m) setQ(decodeURIComponent(m[1]));
  }, [location]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (query) navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-2 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <button
        data-testid="button-menu"
        onClick={onMenu}
        aria-label="Toggle menu"
        className="rounded-full p-2 text-foreground hover:bg-secondary"
      >
        <Menu size={22} />
      </button>
      <Logo />

      <form onSubmit={submit} className="mx-auto flex w-full max-w-xl items-center" role="search">
        <input
          data-testid="input-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search YouTubers, channels, videos…"
          aria-label="Search"
          className="h-10 w-full rounded-l-full border border-border bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <button
          data-testid="button-search"
          type="submit"
          aria-label="Search"
          className="flex h-10 w-14 items-center justify-center rounded-r-full border border-l-0 border-border bg-secondary hover:brightness-110"
        >
          <Search size={18} />
        </button>
      </form>

      <Link
        href="/saved"
        data-testid="link-saved"
        className="relative hidden rounded-full p-2 text-foreground hover:bg-secondary sm:block"
        aria-label="Saved videos"
      >
        <Bookmark size={20} />
        {saved && saved.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {saved.length > 99 ? "99+" : saved.length}
          </span>
        )}
      </Link>
      <button
        data-testid="button-theme"
        onClick={toggle}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        className="rounded-full p-2 text-foreground hover:bg-secondary"
      >
        {dark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </header>
  );
}

// ---- sidebar ----
const NAV = [
  { href: "/", label: "Home", icon: House, testid: "link-home" },
  { href: "/saved", label: "Saved", icon: Bookmark, testid: "link-saved-nav" },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { data: saved } = useSavedVideos();
  return (
    <nav className="flex flex-col gap-1 p-2" aria-label="Main">
      {NAV.map((item) => {
        const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            data-testid={item.testid}
            className={cn(
              "flex items-center gap-5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-secondary",
              active && "bg-secondary font-semibold",
            )}
          >
            <span className="relative">
              <Icon size={22} className={active ? "text-primary" : ""} />
              {item.href === "/saved" && saved && saved.length > 0 && (
                <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  {saved.length > 9 ? "9+" : saved.length}
                </span>
              )}
            </span>
            {item.label}
          </Link>
        );
      })}
      <div className="mt-4 border-t border-border pt-3 px-3 text-[11px] leading-relaxed text-muted-foreground">
        Videos play via YouTube's official player. VidVault is a fan-made browser — not affiliated with YouTube.
      </div>
    </nav>
  );
}

// ---- layout shell ----
export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true); // expanded sidebar on desktop
  const [drawer, setDrawer] = useState(false); // mobile overlay
  const [location] = useLocation();
  const isWatch = useRoute("/watch/:id")[0];

  // watch page hides the sidebar entirely, like YouTube
  const showSidebar = !isWatch;

  return (
    <div className="min-h-screen bg-background">
      <Header
        onMenu={() => {
          if (window.innerWidth < 1024) setDrawer((d) => !d);
          else setOpen((o) => !o);
        }}
      />
      <div className="flex pt-14">
        {showSidebar && (
          <>
            {/* desktop sidebar */}
            <aside
              className={cn(
                "fixed left-0 top-14 bottom-0 z-40 hidden shrink-0 overflow-y-auto scrollbar-thin bg-background lg:block",
                open ? "w-60" : "w-[72px]",
              )}
            >
              <SidebarContent />
            </aside>
            {/* mobile drawer */}
            {drawer && (
              <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
                <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
                <aside className="absolute left-0 top-0 bottom-0 w-60 overflow-y-auto bg-background shadow-xl">
                  <div className="flex h-14 items-center gap-3 px-4">
                    <button
                      onClick={() => setDrawer(false)}
                      aria-label="Close menu"
                      className="rounded-full p-2 hover:bg-secondary"
                    >
                      <Menu size={22} />
                    </button>
                    <Logo />
                  </div>
                  <SidebarContent onNavigate={() => setDrawer(false)} />
                </aside>
              </div>
            )}
          </>
        )}
        <main
          key={location}
          className={cn(
            "min-h-[calc(100vh-3.5rem)] w-full px-4 pb-16 pt-4 sm:px-6",
            showSidebar && (open ? "lg:pl-64" : "lg:pl-[88px]"),
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export { ThemeProvider };
