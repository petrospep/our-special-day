import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { to: "/", hash: "home", label: "Home" },
  { to: "/", hash: "events", label: "Events" },
  { to: "/", hash: "music", label: "Music" },
  { to: "/", hash: "gifts", label: "Gifts" },
  { to: "/", hash: "faq", label: "FAQ" },
  { to: "/rsvp", label: "RSVP" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-cream/80 border-b border-olive/15">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link to="/" hash="home" className="display-italic text-xl text-olive tracking-wide">
          P <span className="display-serif not-italic mx-1">&</span> N
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              hash={"hash" in l ? l.hash : undefined}
              className="text-sm text-foreground/80 hover:text-olive transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-olive"
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <nav className="md:hidden border-t border-olive/15 bg-cream/95 px-6 py-4 flex flex-col gap-3">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              hash={"hash" in l ? l.hash : undefined}
              onClick={() => setOpen(false)}
              className="text-sm text-foreground/80"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
