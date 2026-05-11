import { useLanguage } from "@/lib/i18n";

export function SiteFooter() {
  const { language } = useLanguage();

  return (
    <footer className="mt-24 border-t border-olive/15 py-10">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <p className="display-italic text-2xl text-olive">Petros &amp; Nikki</p>
        <p className="eyebrow mt-3">
          {language === "en" ? "25 · 07 · 2026 — Athens, Greece" : "25 · 07 · 2026 — Αθήνα, Ελλάδα"}
        </p>
      </div>
    </footer>
  );
}
