import Link from "next/link";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/players", label: "Players" },
  { href: "/teams", label: "Teams" },
  { href: "/matchups", label: "Head-to-Head" },
  { href: "/rookies", label: "Rookies" },
  { href: "/awards", label: "Awards" },
];

export default function SiteNav() {
  return (
    <header className="px-6 pt-10 md:px-14">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-cyan-400/20 p-2">
            <div className="h-full w-full rounded-xl bg-cyan-400/40" />
          </div>
          <span className="text-lg font-semibold tracking-wide text-white">
            Crosby IQ
          </span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs uppercase tracking-[0.3em] text-slate-300 transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
