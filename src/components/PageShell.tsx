import { Watercolor } from "./Watercolor";

interface Props {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}

export function PageShell({ eyebrow, title, subtitle, children }: Props) {
  return (
    <div className="relative overflow-hidden">
      <Watercolor blob="coral" className="-top-20 -left-24 w-[28rem] opacity-70 -rotate-12" />
      <Watercolor blob="green" className="top-32 -right-32 w-[26rem] opacity-60" />
      <Watercolor blob="yellow" className="top-[42rem] -left-20 w-[22rem] opacity-60" />

      <div className="relative mx-auto max-w-4xl px-6 pt-16 pb-8 text-center">
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        <h1 className="display-serif text-5xl md:text-7xl text-olive">{title}</h1>
        {subtitle && (
          <p className="mt-5 text-lg text-foreground/75 max-w-xl mx-auto">{subtitle}</p>
        )}
      </div>
      <div className="relative mx-auto max-w-4xl px-6 pb-16">{children}</div>
    </div>
  );
}
