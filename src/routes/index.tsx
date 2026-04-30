import { createFileRoute, Link } from "@tanstack/react-router";
import { Watercolor } from "../components/Watercolor";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Watercolor blobs around the frame, echoing the invitation */}
      <Watercolor blob="coral" className="-top-24 -left-20 w-[34rem] opacity-80 -rotate-12" />
      <Watercolor blob="yellow" className="top-10 right-[-6rem] w-[36rem] opacity-85" />
      <Watercolor blob="green" className="top-[18rem] right-[-4rem] w-[24rem] opacity-70" />
      <Watercolor blob="yellow" className="bottom-[-6rem] left-[-2rem] w-[32rem] opacity-80" />
      <Watercolor blob="green" className="bottom-[-4rem] left-[18rem] w-[18rem] opacity-60" />
      <Watercolor blob="coral" className="bottom-10 right-[20%] w-[18rem] opacity-50" />

      <section className="relative mx-auto max-w-4xl px-6 pt-20 pb-32">
        <div className="frame-border relative py-24 md:py-32 px-6 text-center">
          {/* Couple photo placeholder layer (you can drop in over this) */}
          <div className="mx-auto mb-10 h-32 w-32 rounded-full border border-olive/30 bg-cream/60 backdrop-blur-sm flex items-center justify-center">
            <span className="display-italic text-olive/70 text-sm">photo</span>
          </div>

          <h1 className="display-serif text-7xl md:text-9xl tracking-tight text-olive leading-[0.9]">
            SAVE
            <span className="block display-italic text-5xl md:text-7xl my-2 text-olive/90">
              the
            </span>
            DATE
          </h1>

          <div className="mt-12 space-y-4">
            <p className="display-serif text-3xl md:text-4xl text-olive">
              Petros &amp; Nikki
            </p>
            <p className="text-base md:text-lg tracking-wide text-foreground/80">
              Saturday, 25<sup>th</sup> July 2026
            </p>
            <div className="mx-auto h-px w-10 bg-olive/40" />
            <p className="text-base text-foreground/80">Athens, Greece</p>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/rsvp"
              className="inline-flex items-center justify-center rounded-sm bg-olive px-8 py-3 text-sm tracking-[0.2em] uppercase text-cream hover:bg-olive/90 transition"
            >
              RSVP
            </Link>
            <Link
              to="/events"
              className="inline-flex items-center justify-center rounded-sm border border-olive/40 px-8 py-3 text-sm tracking-[0.2em] uppercase text-olive hover:bg-olive/5 transition"
            >
              The Day
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
