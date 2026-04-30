import { Reveal } from "./Reveal";

interface Props {
  id?: string;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  /** Section palette: tints background + watercolor wash. */
  theme?: "events" | "music" | "gifts" | "faq" | "rsvp";
}

export function PageShell({ id, eyebrow, title, subtitle, children, theme }: Props) {
  const themeClass = theme ? `section-theme theme-${theme}` : "";
  return (
    <section id={id} className={`relative scroll-mt-20 ${themeClass}`}>
      <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-8 text-center">
        <Reveal>
          {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
          <h2 className="display-serif text-5xl md:text-7xl text-olive">{title}</h2>
          {subtitle && (
            <p className="mt-5 text-lg text-foreground/75 max-w-xl mx-auto">{subtitle}</p>
          )}
        </Reveal>
      </div>
      <div className="relative mx-auto max-w-4xl px-6 pb-16">
        <Reveal delay={120}>{children}</Reveal>
      </div>
    </section>
  );
}
