import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Home } from "lucide-react";
import invitationImage from "@/assets/invitation-reference.png";

export const Route = createFileRoute("/invitation")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  component: Invitation,
});

function Invitation() {
  const search = Route.useSearch();
  const inviteCode = (search.code ?? "").trim().toLowerCase();
  const homeSearch = inviteCode ? { code: inviteCode } : {};

  return (
    <section className="section-theme theme-hero min-h-screen px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6">
        <img
          src={invitationImage}
          alt="Wedding invitation for Petros and Nikki"
          className="w-full max-w-3xl border border-olive/20 bg-cream shadow-xl shadow-olive/10"
        />

        <div className="sticky bottom-4 z-20 flex w-full max-w-3xl flex-col gap-3 border border-olive/20 bg-cream/90 p-3 shadow-lg shadow-olive/10 backdrop-blur-md sm:flex-row">
          <Link
            to="/"
            hash="rsvp"
            search={homeSearch}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-sm bg-olive px-5 py-3 text-sm uppercase tracking-[0.2em] text-cream transition hover:bg-olive/90"
          >
            RSVP
            <ArrowRight size={16} aria-hidden />
          </Link>
          <Link
            to="/"
            search={homeSearch}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-sm border border-olive/40 px-5 py-3 text-sm uppercase tracking-[0.2em] text-olive transition hover:bg-olive/5"
          >
            <Home size={16} aria-hidden />
            Home
          </Link>
        </div>
      </div>
    </section>
  );
}
