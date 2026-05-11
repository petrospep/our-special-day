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
import type {
  SubmittedSongRequest,
  SubmitSongRequestResponse,
  ValidateInviteResponse,
} from "@/lib/rsvp-types";
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
      <RsvpContent initialCodeFromUrl={inviteCode} />
      <MusicSection inviteCode={inviteCode} />
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
  song_title: z.string().trim().min(1, "Song title is required").max(150),
  artist: z.string().trim().min(1, "Artist is required").max(150),
});

const MUSIC_REQUEST_LIMIT = 3;

type MusicRequestUsage = {
  submitted: number;
  left: number;
  limit: number;
};

type MusicBlockReason = "invalid_code" | "rsvp_required" | "maybe" | "not_attending";

const musicBlockCopy: Record<MusicBlockReason, { title: string; message: string }> = {
  invalid_code: {
    title: "We need your invitation code",
    message: "Enter the code from your invitation after you have RSVP'd yes.",
  },
  rsvp_required: {
    title: "RSVP first, then send us your song",
    message:
      "Music requests open after you submit an attending RSVP. Once that is done, we will use your RSVP name automatically here.",
  },
  maybe: {
    title: "Please confirm first",
    message: "Once you confirm that you are joining us, you will be able to request music.",
  },
  not_attending: {
    title: "We will miss you on the dance floor",
    message:
      "We are sorry you cannot make it. Music requests are for guests joining us on the day, but please let us know if your plans change.",
  },
};

function normalizeMusicUsage(response: {
  songRequestsSubmitted?: number;
  songRequestsLeft?: number;
  songRequestLimit?: number;
  songRequestGuestName?: string;
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
  const [musicGuestName, setMusicGuestName] = useState("");
  const [blockReason, setBlockReason] = useState<MusicBlockReason>("invalid_code");
  const [songRequests, setSongRequests] = useState<SubmittedSongRequest[]>([]);
  const [musicUsage, setMusicUsage] = useState<MusicRequestUsage>({
    submitted: 0,
    left: MUSIC_REQUEST_LIMIT,
    limit: MUSIC_REQUEST_LIMIT,
  });
  const [submitting, setSubmitting] = useState(false);

  async function validateCode(rawCode: string) {
    const parsed = inviteCodeSchema.safeParse(rawCode);
    if (!parsed.success) {
      setBlockReason("invalid_code");
      setStatus("invalid");
      return;
    }

    setStatus("validating");
    try {
      const validation = await callFunction<ValidateInviteResponse>("validate-invite", {
        code: parsed.data,
        includeSongRequestUsage: true,
        allowUsedForSongRequests: true,
        requireAttendingRsvpForSongRequests: true,
      });
      if (validation.ok && validation.valid) {
        setManualCode(parsed.data);
        setMusicGuestName(validation.songRequestGuestName ?? "");
        setSongRequests(validation.songRequests ?? []);
        setMusicUsage(normalizeMusicUsage(validation));
        setStatus("ready");
        return;
      }
      if (validation.ok && !validation.valid) {
        setBlockReason(
          validation.reason === "rsvp_required"
            ? "rsvp_required"
            : validation.reason === "maybe"
              ? "maybe"
              : validation.reason === "not_attending"
                ? "not_attending"
                : "invalid_code",
        );
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
        songTitle: parsed.data.song_title,
        artist: parsed.data.artist,
      });
      if (response.ok) {
        setMusicUsage(normalizeMusicUsage(response));
        setSongRequests(response.songRequests ?? []);
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
      } else if (error instanceof Error && error.message === "rsvp_required") {
        setStatus("invalid");
        setBlockReason("rsvp_required");
      } else if (error instanceof Error && error.message === "maybe") {
        setStatus("invalid");
        setBlockReason("maybe");
      } else if (error instanceof Error && error.message === "not_attending") {
        setStatus("invalid");
        setBlockReason("not_attending");
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

  const blockCopy = musicBlockCopy[blockReason];
  const showMusicCodeField =
    status !== "invalid" || !["rsvp_required", "maybe", "not_attending"].includes(blockReason);

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
              <p className="display-serif text-3xl text-olive">{blockCopy.title}</p>
              <p className="mt-3 text-foreground/75">{blockCopy.message}</p>
            </div>
            {showMusicCodeField && (
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
            )}
            {status === "invalid" && (
              <div
                id="music-code-error"
                className={`border px-4 py-3 text-sm text-foreground/75 ${
                  blockReason === "rsvp_required"
                    ? "border-olive/25 bg-olive/5"
                    : "border-coral/25 bg-coral/5"
                }`}
                role="alert"
              >
                {blockReason === "rsvp_required" || blockReason === "maybe" ? (
                  <div className="space-y-3">
                    <p>
                      {blockReason === "maybe"
                        ? "When you are ready, update your RSVP to accept and the music form will unlock straight away."
                        : "Please RSVP first. If you are joining us, the music form will unlock straight away."}
                    </p>
                    <a
                      href="#rsvp"
                      className="inline-flex items-center justify-center border border-olive/40 px-4 py-2 text-xs tracking-[0.15em] uppercase text-olive hover:bg-olive/5 transition"
                    >
                      {blockReason === "maybe" ? "Update RSVP" : "Go to RSVP"}
                    </a>
                  </div>
                ) : (
                  <p>
                    {blockReason === "not_attending"
                      ? "If your plans change, please contact Petros directly and we can update your RSVP."
                      : "Please check the code and try again after your attending RSVP has been submitted."}
                  </p>
                )}
              </div>
            )}
            {showMusicCodeField && (
              <button
                type="submit"
                className="w-full bg-olive text-cream py-3.5 text-sm tracking-[0.2em] uppercase rounded-sm hover:bg-olive/90 transition"
              >
                {status === "validating" ? "Checking code..." : "Unlock music requests"}
              </button>
            )}
          </form>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="bg-cream/70 backdrop-blur-sm border border-olive/20 p-8 md:p-10 max-w-xl mx-auto mt-6 space-y-5"
        >
          <p className="text-sm text-foreground/75">{musicUsageMessage(musicUsage)}</p>
          {musicGuestName && (
            <p className="text-sm text-foreground/75">
              Requesting as <span className="font-medium text-olive">{musicGuestName}</span>
            </p>
          )}
          {musicUsage.left <= 0 ? (
            <div className="border border-olive/25 bg-olive/5 px-4 py-3 text-sm text-foreground/75">
              You have reached the maximum of {musicUsage.limit} music requests for this invitation.
            </div>
          ) : (
            <>
              <Field name="song_title" label="Song title" />
              <Field name="artist" label="Band / artist" />
            </>
          )}
          {songRequests.length > 0 && <SongRequestList requests={songRequests} />}
          {musicUsage.left > 0 && (
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-olive text-cream py-3 text-sm tracking-[0.2em] uppercase rounded-sm hover:bg-olive/90 transition disabled:opacity-50"
            >
              <Music size={16} />
              {submitting ? "Adding..." : "Add to playlist"}
            </button>
          )}
        </form>
      )}
    </PageShell>
  );
}

function SongRequestList({ requests }: { requests: SubmittedSongRequest[] }) {
  return (
    <section className="border border-olive/15 bg-olive/5 px-4 py-4">
      <h3 className="eyebrow mb-3">Your music requests</h3>
      <ul className="space-y-2">
        {requests.map((request, index) => (
          <li
            key={`${request.songTitle}-${request.artist}-${request.createdAt}-${index}`}
            className="flex items-start gap-3 text-sm text-foreground/80"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-olive text-[0.65rem] text-cream">
              {index + 1}
            </span>
            <span>
              <span className="font-medium text-olive">{request.songTitle}</span>
              <span className="text-foreground/60"> by </span>
              <span>{request.artist}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
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
    a: ["Please RSVP by 15th June 2026 so we can finalise numbers with our venues."],
  },
  {
    q: "Can I bring a plus-one?",
    a: [
      "Of course! Please add their details and RSVP on their behalf using the “Add guests” button.",
      "The same applies for families: please RSVP for your whole group in this way.",
    ],
  },
  {
    q: "Are children welcome?",
    a: [
      "Of course! Please include each child’s age in the RSVP section, as this will help the venue accommodate your needs.",
    ],
  },
  {
    q: "What time should I arrive?",
    a: ["Please arrive at the church at 19:15, as the ceremony will begin at 19:30."],
  },
  {
    q: "What is the dress code?",
    a: [
      "There is no dress code. Wear whatever you like :) It will be hot, so please keep this in mind.",
    ],
  },
  {
    q: "Where should I stay?",
    a: [
      "For guests who want to get around by car, or stay somewhere by the sea, the coastline south of Glyfada is beautiful.",
      "Some guests may prefer to stay in central Athens to make the most of sightseeing and experience the hustle and bustle of the city. From there, getting around by public transport and taxi is very feasible. Glyfada is connected to the centre by tram and is also very accessible by taxi.",
    ],
  },
  {
    q: "How do I get between the venues?",
    a: [
      "By car or taxi. The reception venue is around a 20-minute drive from the church.",
      "Many guests will be bringing cars. If you do not have a car or a guaranteed ride, please let either Petro or Nikki know directly and we can find a solution based on numbers :)",
    ],
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
            <AccordionContent className="space-y-3 text-foreground/75 leading-relaxed pb-5">
              {f.a.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
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
