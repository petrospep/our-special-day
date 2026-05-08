import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copyInviteCode() {
    if (!inviteCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success("Invitation code copied.");
    } catch {
      toast.error("Could not copy invitation code.");
    }
  }

  return (
    <section className="section-theme theme-hero min-h-screen px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6">
        <img
          src={invitationImage}
          alt="Wedding invitation for Petros and Nikki"
          className="w-full max-w-3xl border border-olive/20 bg-cream shadow-xl shadow-olive/10"
        />

        <div className="sticky bottom-4 z-20 w-full max-w-3xl border border-olive/20 bg-cream/90 p-3 shadow-lg shadow-olive/10 backdrop-blur-md">
          {inviteCode ? (
            <button
              type="button"
              onClick={copyInviteCode}
              className="mx-auto mb-3 flex items-center justify-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-olive/55 transition hover:text-olive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
              aria-label={`Copy invitation code ${inviteCode}`}
            >
              Invitation code {inviteCode}
              {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
            </button>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
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
      </div>
    </section>
  );
}
