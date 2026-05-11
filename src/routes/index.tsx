import { createFileRoute } from "@tanstack/react-router";
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
import { toast } from "sonner";
import { callFunction } from "@/lib/functions";
import { RsvpContent } from "@/components/RsvpContent";
import type { SubmitSongRequestResponse, ValidateInviteResponse } from "@/lib/rsvp-types";
import { inviteCodeSchema } from "@/lib/rsvp-validation";
import couplePhoto from "@/assets/couplephoto.jpg";

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
    <section
      id="home"
      className="relative isolate min-h-[92svh] scroll-mt-20 overflow-hidden bg-transparent"
    >
      <img
        src={couplePhoto}
        alt="Petros and Nikki"
        className="absolute inset-0 h-full w-full object-contain object-center"
      />
    </section>
  );
}

/* ---------------- Events ---------------- */
const events = [
  {
    time: "19:30",
    title: "Wedding ceremony",
    venue: "Saints Constantine and Helen Orthodox Cathedral of Glyfada",
    address: "Glyfada, Athens, Greece",
    dress: "Please arrive by 19:15.",
    note: "You are cordially invited to join us as we begin our wedding celebration.",
  },
  {
    time: "Following the ceremony",
    title: "Reception",
    venue: "Efllena",
    address: "Odos Amenon, Oikismos Galene, Koropi, 194 00",
    dress: "Dinner and dancing to follow.",
    note: "We look forward to celebrating with you after the ceremony.",
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
      subtitle="You are cordially invited to the wedding of Petros & Nikki in Athens, Greece."
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
                <p className="text-sm">
                  {e.title === "Wedding ceremony" ? `Begins at ${e.time}` : e.time}
                </p>
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

const MUSIC_REQUEST_LIMIT = 3;

type MusicRequestUsage = {
  submitted: number;
  left: number;
  limit: number;
};

function normalizeMusicUsage(response: {
  songRequestsSubmitted?: number;
  songRequestsLeft?: number;
  songRequestLimit?: number;
}): MusicRequestUsage {
  const limit = response.songRequestLimit ?? MUSIC_REQUEST_LIMIT;
  const submitted = response.songRequestsSubmitted ?? 0;

  return {
    submitted,
    left: response.songRequestsLeft ?? Math.max(limit - submitted, 0),
    limit,
  };
}

function musicUsageMessage(usage: MusicRequestUsage) {
  const requestLabel = usage.submitted === 1 ? "request" : "requests";
  const leftLabel = usage.left === 1 ? "request" : "requests";

  return `You have already submitted ${usage.submitted} music ${requestLabel}. You have ${usage.left} ${leftLabel} left.`;
}

function MusicSection({ inviteCode }: { inviteCode: string }) {
  const [status, setStatus] = useState<"idle" | "validating" | "ready" | "invalid">(
    inviteCodeSchema.safeParse(inviteCode).success ? "validating" : "idle",
  );
  const [manualCode, setManualCode] = useState(inviteCode);
  const [musicUsage, setMusicUsage] = useState<MusicRequestUsage>({
    submitted: 0,
    left: MUSIC_REQUEST_LIMIT,
    limit: MUSIC_REQUEST_LIMIT,
  });
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
        includeSongRequestUsage: true,
        allowUsedForSongRequests: true,
      });
      if (validation.ok && validation.valid) {
        setManualCode(parsed.data);
        setMusicUsage(normalizeMusicUsage(validation));
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
    if (musicUsage.left <= 0) {
      toast.error("This invite code already reached the 3 music-request limit.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await callFunction<SubmitSongRequestResponse>("submit-song-request", {
        code: manualCode.trim().toLowerCase(),
        guestName: parsed.data.guest_name,
        songTitle: parsed.data.song_title,
        artist: parsed.data.artist,
      });
      if (response.ok) {
        setMusicUsage(normalizeMusicUsage(response));
      }
      toast.success("Added to the playlist.");
      form.reset();
    } catch (error) {
      console.error(error);

      if (error instanceof Error && error.message === "song_request_limit_reached") {
        setMusicUsage((current) => ({
          ...current,
          submitted: current.limit,
          left: 0,
        }));
        toast.error("This invite code already reached the 3 music-request limit.");
      } else {
        toast.error("Could not save your request. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
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
        <div className="bg-cream/70 backdrop-blur-sm border border-olive/20 p-8 md:p-12 max-w-2xl mx-auto mt-6">
          <form onSubmit={onCodeSubmit} className="space-y-6" noValidate>
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
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="bg-cream/70 backdrop-blur-sm border border-olive/20 p-8 md:p-10 max-w-xl mx-auto mt-6 space-y-5"
        >
          <p className="text-sm text-foreground/75">{musicUsageMessage(musicUsage)}</p>
          <Field name="guest_name" label="Your name" />
          <Field name="song_title" label="Song title" />
          <Field name="artist" label="Artist" />
          <button
            type="submit"
            disabled={submitting || musicUsage.left <= 0}
            className="w-full inline-flex items-center justify-center gap-2 bg-olive text-cream py-3 text-sm tracking-[0.2em] uppercase rounded-sm hover:bg-olive/90 transition disabled:opacity-50"
          >
            <Music size={16} />
            {submitting ? "Adding..." : musicUsage.left <= 0 ? "Limit reached" : "Add to playlist"}
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
    a: "Please RSVP by 15th June 2026 so we can finalise numbers with our venues.",
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
    a: "The wedding ceremony begins at 19:30. Please arrive by 19:15 so we can start on time.",
  },
  {
    q: "What is the dress code?",
    a: "Formal attire with light, summery colours for the ceremony. Cocktail attire for the reception — and bring shoes you can dance in.",
  },
  {
    q: "Where should I stay?",
    a: "We recommend staying in Athens or near the southern coast, with easy access to Glyfada and Koropi.",
  },
  {
    q: "Will there be transport between venues?",
    a: "The reception will follow the ceremony at Efllena, Odos Amenon, Oikismos Galene, Koropi, 194 00.",
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
