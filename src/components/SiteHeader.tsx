import { Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const links = [
  { to: "/", hash: "home", label: { en: "Home", el: "Αρχική" } },
  { to: "/", hash: "events", label: { en: "Events", el: "Πρόγραμμα" } },
  { to: "/", hash: "rsvp", label: "RSVP" },
  { to: "/", hash: "music", label: { en: "Music", el: "Μουσική" } },
  { to: "/", hash: "gifts", label: { en: "Gifts", el: "Λίστα Γάμου" } },
  { to: "/", hash: "faq", label: { en: "FAQ", el: "Συχνές Ερωτήσεις" } },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { language, toggleLanguage } = useLanguage();
  const search = useSearch({ strict: false });
  const inviteCode = typeof search.code === "string" ? search.code.trim().toLowerCase() : undefined;
  const searchLanguage = search.lang === "el" || search.lang === "en" ? search.lang : undefined;
  const linkSearch = { code: inviteCode, lang: searchLanguage };
  const languageToggleLabel =
    language === "en" ? "Switch language to Greek" : "Αλλαγή γλώσσας στα Αγγλικά";

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-cream/80 border-b border-olive/15">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link
          to="/"
          hash="home"
          search={linkSearch}
          className="display-italic text-xl text-olive tracking-wide"
        >
          P <span className="display-serif not-italic mx-1">&</span> N
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.hash}
              to={l.to}
              search={linkSearch}
              hash={"hash" in l ? l.hash : undefined}
              className="text-sm text-foreground/80 hover:text-olive transition-colors"
            >
              {typeof l.label === "string" ? l.label : l.label[language]}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex min-h-9 items-center justify-center border border-olive/30 px-3 text-xs font-medium uppercase tracking-[0.14em] text-olive transition hover:bg-olive/5"
            aria-label={languageToggleLabel}
          >
            {language === "en" ? "ΕΛ" : "EN"}
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-olive"
            aria-label={language === "en" ? "Toggle menu" : "Άνοιγμα/κλείσιμο μενού"}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-olive/15 bg-cream/95 px-6 py-4 flex flex-col gap-3">
          {links.map((l) => (
            <Link
              key={l.hash}
              to={l.to}
              search={linkSearch}
              hash={"hash" in l ? l.hash : undefined}
              onClick={() => setOpen(false)}
              className="text-sm text-foreground/80"
            >
              {typeof l.label === "string" ? l.label : l.label[language]}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
