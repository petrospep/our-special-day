import { Link, createFileRoute } from "@tanstack/react-router";
import { Watercolor } from "../components/Watercolor";
import { PageShell } from "../components/PageShell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { MapPin, Clock, Shirt, Music, Heart } from "lucide-react";
import { Reveal } from "../components/Reveal";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { callFunction } from "@/lib/functions";
import { RsvpContent } from "./rsvp";
import type { ValidateInviteResponse } from "@/lib/rsvp-types";
import { inviteCodeSchema } from "@/lib/rsvp-validation";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  component: Index,
});

function Index() {
  const search = Route.useSearch();
  const inviteCode = useMemo(() => (search.code ?? "").trim().toLowerCase(), [search.code]);

  return (
    <div className="relative overflow-hidden">
      {/* Floating watercolor blobs sprinkled down the page */}
      <Watercolor blob="coral" className="-top-24 -left-20 w-[34rem] opacity-80 -rotate-12" />
      <Watercolor blob="yellow" className="top-10 right-[-6rem] w-[36rem] opacity-85" />
      <Watercolor blob="green" className="top-[28rem] right-[-4rem] w-[24rem] opacity-60" />
      <Watercolor blob="yellow" className="top-[60rem] -left-24 w-[28rem] opacity-70" />
      <Watercolor
        blob="coral"
        className="top-[95rem] right-[-5rem] w-[26rem] opacity-60 -rotate-6"
      />
      <Watercolor blob="green" className="top-[130rem] -left-16 w-[24rem] opacity-55" />
      <Watercolor blob="yellow" className="top-[170rem] right-[-6rem] w-[28rem] opacity-65" />
      <Watercolor blob="coral" className="top-[210rem] -left-20 w-[22rem] opacity-50" />

      <Hero />
      <EventsSection />
      <MusicSection inviteCode={inviteCode} />
      <RsvpContent initialCodeFromUrl={inviteCode} />
      <GiftsSection />
      <FaqSection />
    </div>
  );
}

/* ---------------- Hero ---------------- */
function Hero() {
  return (
    <section id="home" className="relative scroll-mt-20 section-theme theme-hero">
      <div className="relative mx-auto max-w-4xl px-6 py-16">
        <div className="bg-cream/85 backdrop-blur-md border border-olive/20 shadow-xl rounded-sm">
          <div className="frame-border relative py-24 md:py-32 px-6 text-center">
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
              <p className="display-serif text-3xl md:text-4xl text-olive">Petros &amp; Nikki</p>
              <p className="text-base md:text-lg tracking-wide text-foreground/80">
                Saturday, 25<sup>th</sup> July 2026
              </p>
              <div className="mx-auto h-px w-10 bg-olive/40" />
              <p className="text-base text-foreground/80">Athens, Greece</p>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/" hash="rsvp"
                className="inline-flex items-center justify-center rounded-sm bg-olive px-8 py-3 text-sm tracking-[0.2em] uppercase text-cream hover:bg-olive/90 transition"
              >
                RSVP
              </Link>
              <a
                href="#events"
                className="inline-flex items-center justify-center rounded-sm border border-olive/40 px-8 py-3 text-sm tracking-[0.2em] uppercase text-olive hover:bg-olive/5 transition"
              >
                The Day
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Events ---------------- */
const events = [
  {
    time: "5:30 PM",
    title: "Ceremony",
    venue: "Agios Dimitrios Church",
    address: "Plaka, Athens",
    dress: "Formal · Light colours encouraged",
    note: "Doors open at 5:00 PM. Please arrive a little early so we can begin on time.",
  },
  {
    time: "7:30 PM",
    title: "Reception",
    venue: "Island Art & Taste",
    address: "Limanakia, Vouliagmeni",
    dress: "Cocktail attire · Comfortable shoes for dancing",
    note: "Welcome drinks, dinner under the stars, and dancing until late.",
  },
];

function EventsSection() {
  return (
    <PageShell
      id="events"
      theme="events"
      eyebrow="The Day"
      title={
        <>
          Saturday, 25<sup className="text-3xl">th</sup> July
        </>
      }
      subtitle="Two moments to share with the people we love most."
    >
      <div className="space-y-8 mt-8">
        {events.map((e) => (
          <article
            key={e.title}
            className="relative bg-cream/70 backdrop-blur-sm border border-olive/20 p-8 md:p-12"
          >
            <p className="eyebrow">{e.time}</p>
            <h3 className="display-serif text-4xl md:text-5xl text-olive mt-3">{e.title}</h3>
            <div className="mt-6 grid sm:grid-cols-2 gap-5 text-foreground/80">
              <div className="flex gap-3">
                <MapPin size={18} className="text-olive shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-olive">{e.venue}</p>
                  <p className="text-sm">{e.address}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock size={18} className="text-olive shrink-0 mt-1" />
                <p className="text-sm">Begins at {e.time}</p>
              </div>
              <div className="flex gap-3 sm:col-span-2">
                <Shirt size={18} className="text-olive shrink-0 mt-1" />
                <p className="text-sm">{e.dress}</p>
              </div>
            </div>
            <p className="display-italic text-lg text-olive/80 mt-8 border-t border-olive/15 pt-6">
              {e.note}
            </p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

/* ---------------- Music ---------------- */
const songSchema = z.object({
  guest_name: z.string().trim().min(1, "Your name is required").max(100),
  song_title: z.string().trim().min(1, "Song title is required").max(150),
  artist: z.string().trim().min(1, "Artist is required").max(150),
});

function MusicSection({ inviteCode }: { inviteCode: string }) {
  const [status, setStatus] = useState<"idle" | "validating" | "ready" | "invalid">(
    inviteCodeSchema.safeParse(inviteCode).success ? "validating" : "idle",
  );
  const [manualCode, setManualCode] = useState(inviteCode);
  const [submitting, setSubmitting] = useState(false);

  async function validateCode(rawCode: string) {
    const parsed = inviteCodeSchema.safeParse(rawCode);
    if (!parsed.success) {
      setStatus("invalid");
      return;
    }

    setStatus("validating");
    try {
      const validation = await callFunction<ValidateInviteResponse>("validate-invite", {
        code: parsed.data,
      });
      if (validation.ok && validation.valid) {
        setStatus("ready");
        return;
      }
      setStatus("invalid");
    } catch {
      setStatus("invalid");
      toast.error("Could not validate invite code.");
    }
  }

  function onCodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void validateCode(manualCode);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const parsed = songSchema.safeParse({
      guest_name: fd.get("guest_name"),
      song_title: fd.get("song_title"),
      artist: fd.get("artist"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    if (status !== "ready") {
      toast.error("Validate your invite code before requesting music.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("song_requests").insert(parsed.data);
    setSubmitting(false);
    if (error) {
      toast.error("Could not save your request. Please try again.");
      return;
    }
    toast.success("Added to the playlist 🎶");
    form.reset();
  }

  useEffect(() => {
    if (inviteCodeSchema.safeParse(inviteCode).success) {
      setManualCode(inviteCode);
      void validateCode(inviteCode);
    }
  }, [inviteCode]);

  return (
    <PageShell
      id="music"
      theme="music"
      eyebrow="Music"
      title="Keep us dancing"
      subtitle="What song will get you on the dance floor? Tell us — we’ll make sure the DJ knows."
    >
      {status !== "ready" ? (
        <form onSubmit={onCodeSubmit} className="max-w-xl mx-auto mt-6 space-y-6" noValidate>
          <div className="text-center">
            <p className="display-serif text-3xl text-olive">We need your invitation code</p>
            <p className="mt-3 text-foreground/75">
              Enter the code from your invitation to unlock the music request form.
            </p>
          </div>
          <label className="block">
            <span className="eyebrow block mb-2">Invitation code</span>
            <input
              name="code"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              autoComplete="off"
              aria-invalid={status === "invalid"}
              aria-describedby={status === "invalid" ? "music-code-error" : undefined}
              placeholder="w-xxxxxxxx"
              className="w-full bg-transparent border-b border-olive/30 focus:border-olive outline-none py-3 text-foreground placeholder:text-muted-foreground"
            />
          </label>
          {status === "invalid" && (
            <p id="music-code-error" className="text-sm text-destructive" role="alert">
              Please enter a valid, active invite code.
            </p>
          )}
          <button
            type="submit"
            className="w-full bg-olive text-cream py-3.5 text-sm tracking-[0.2em] uppercase rounded-sm hover:bg-olive/90 transition"
          >
            {status === "validating" ? "Checking code..." : "Unlock music requests"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={onSubmit}
          className="bg-cream/70 backdrop-blur-sm border border-olive/20 p-8 md:p-10 max-w-xl mx-auto mt-6 space-y-5"
        >
          <Field name="guest_name" label="Your name" />
          <Field name="song_title" label="Song title" />
          <Field name="artist" label="Artist" />
          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-olive text-cream py-3 text-sm tracking-[0.2em] uppercase rounded-sm hover:bg-olive/90 transition disabled:opacity-50"
          >
            <Music size={16} />
            {submitting ? "Adding…" : "Add to playlist"}
          </button>
        </form>
      )}
    </PageShell>
  );
}

/* ---------------- Gifts ---------------- */
function GiftsSection() {
  return (
    <PageShell
      id="gifts"
      theme="gifts"
      eyebrow="With Love"
      title="A little note on gifts"
      subtitle="Your presence at our wedding is the greatest gift of all."
    >
      <div className="bg-cream/70 backdrop-blur-sm border border-olive/20 p-10 md:p-14 text-center max-w-2xl mx-auto mt-6">
        <Heart size={28} className="mx-auto text-coral" strokeWidth={1.5} />
        <p className="display-italic text-2xl md:text-3xl text-olive mt-6 leading-relaxed">
          “If you wish to honour us with a gift, a contribution toward our honeymoon would mean the
          world.”
        </p>
        <div className="mx-auto h-px w-10 bg-olive/40 my-8" />
        <p className="text-foreground/75 leading-relaxed">
          We’re saving up for a slow trip across the Greek islands after the wedding — long lunches,
          swims, and golden hours. Any contribution, big or small, helps make those memories.
        </p>
        <p className="eyebrow mt-10">Honeymoon Fund</p>
        <p className="display-serif text-2xl text-olive mt-2">
          Details will be shared with your invitation
        </p>
      </div>
    </PageShell>
  );
}

/* ---------------- FAQ ---------------- */
const faqs = [
  {
    q: "When should I RSVP by?",
    a: "Please respond by 1st June 2026 so we can finalise numbers with our venues.",
  },
  {
    q: "Can I bring a plus-one?",
    a: "Your invitation will indicate the number of seats reserved for you. If you have any questions, just send us a message in the RSVP form.",
  },
  {
    q: "Are children welcome?",
    a: "We adore little ones, but our reception is an adults-only celebration. Children are very welcome at the ceremony.",
  },
  {
    q: "What time should I arrive?",
    a: "The ceremony begins at 5:30 PM. Please arrive between 5:00 and 5:20 PM so we can start on time.",
  },
  {
    q: "What is the dress code?",
    a: "Formal attire with light, summery colours for the ceremony. Cocktail attire for the reception — and bring shoes you can dance in.",
  },
  {
    q: "Where should I stay?",
    a: "We recommend staying in central Athens (Plaka, Kolonaki) or near the southern coast in Vouliagmeni. We’ll share a list of partner hotels in your invitation.",
  },
  {
    q: "Will there be transport between venues?",
    a: "Yes — coaches will run from the church to the reception, and back to central Athens late in the evening.",
  },
  {
    q: "Any dietary requirements?",
    a: "Let us know in your RSVP. We’ll happily accommodate vegetarian, vegan, gluten-free, and allergy needs.",
  },
];

function FaqSection() {
  return (
    <PageShell
      id="faq"
      theme="faq"
      eyebrow="Good to Know"
      title="FAQs"
      subtitle="Everything you might be wondering about our day."
    >
      <Accordion
        type="single"
        collapsible
        className="bg-cream/70 backdrop-blur-sm border border-olive/20 px-6 md:px-10 py-2 mt-6"
      >
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`q-${i}`} className="border-olive/15">
            <AccordionTrigger className="text-left display-serif text-xl text-olive hover:no-underline py-5">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="text-foreground/75 leading-relaxed pb-5">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </PageShell>
  );
}

/* ---------------- Form primitives ---------------- */
function Field({ name, label }: { name: string; label: string }) {
  return (
    <label className="block">
      <span className="eyebrow block mb-2">{label}</span>
      <input
        name={name}
        required
        className="w-full bg-transparent border-b border-olive/30 focus:border-olive outline-none py-2 text-foreground placeholder:text-muted-foreground"
      />
    </label>
  );
}
