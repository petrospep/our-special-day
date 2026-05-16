import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "../components/PageShell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { MapPin, Clock, Wine, Music, Heart, Eye, LockKeyhole, Copy, Check } from "lucide-react";
import { Reveal } from "../components/Reveal";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { callFunction } from "@/lib/functions";
import { useLanguage, type Language } from "@/lib/i18n";
import { RsvpContent } from "@/components/RsvpContent";
import type {
  GiftRegion,
  RevealGiftDetailsResponse,
  SubmittedSongRequest,
  SubmitSongRequestResponse,
  ValidateInviteResponse,
} from "@/lib/rsvp-types";
import { inviteCodeSchema } from "@/lib/rsvp-validation";
import couplePhoto from "@/assets/couplephoto.jpg";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
    lang: search.lang === "el" || search.lang === "en" ? (search.lang as "el" | "en") : undefined,
  }),
  component: Index,
});

function Index() {
  const search = Route.useSearch();
  const inviteCode = useMemo(() => (search.code ?? "").trim().toLowerCase(), [search.code]);
  const [musicInviteCode, setMusicInviteCode] = useState(inviteCode);
  const [musicRefreshKey, setMusicRefreshKey] = useState(0);

  useEffect(() => {
    setMusicInviteCode(inviteCode);
  }, [inviteCode]);

  return (
    <div className="relative overflow-hidden">
      <Hero />
      <EventsSection />
      <RsvpContent
        initialCodeFromUrl={inviteCode}
        onRsvpSubmitted={(submittedCode) => {
          setMusicInviteCode(submittedCode);
          setMusicRefreshKey((current) => current + 1);
        }}
      />
      <MusicSection inviteCode={musicInviteCode} refreshKey={musicRefreshKey} />
      <GiftsSection inviteCode={inviteCode} />
      <FaqSection />
    </div>
  );
}

/* ---------------- Hero ---------------- */
function Hero() {
  const { language } = useLanguage();

  return (
    <section
      id="home"
      className="relative isolate min-h-[92svh] scroll-mt-20 overflow-hidden bg-transparent"
    >
      <img
        src={couplePhoto}
        alt={language === "en" ? "Petros and Nikki" : "Ο Πέτρος και η Nikki"}
        className="absolute inset-0 h-full w-full object-contain object-center"
      />
    </section>
  );
}

/* ---------------- Events ---------------- */
const events = [
  {
    time: "19:30",
    title: {
      en: "Wedding ceremony",
      el: "Τελετή γάμου",
    },
    venue: {
      en: "Saints Constantine and Helen Orthodox Cathedral of Glyfada",
      el: "Ιερός Καθεδρικός Ναός Αγίων Κωνσταντίνου και Ελένης Γλυφάδας",
    },
    address: {
      en: "Glyfada, Athens",
      el: "Γλυφάδα, Αθήνα",
    },
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Saints%20Constantine%20and%20Helen%20Orthodox%20Cathedral%20of%20Glyfada%2C%20Glyfada%2C%20Athens%2C%20Greece",
    dress: {
      en: "Please arrive by 19:15.",
      el: "Καλό είναι να είστε εκεί έως τις 19:15.",
    },
    note: {
      en: "Please join us at the Church for the Holy Sacrament.",
      el: "Παρακαλούμε να παρευρεθείτε στην Εκκλησία για το Ιερό Μυστήριο.",
    },
    ceremony: true,
  },
  {
    time: {
      en: "Following the ceremony",
      el: "Μετά την τελετή",
    },
    title: {
      en: "Reception",
      el: "Δεξίωση",
    },
    venue: {
      en: "Efilena Estate",
      el: "Κτήμα Εφηλένα",
    },
    address: {
      en: "Odos Anemon, Oikismos Galini, Koropi, 194 00",
      el: "Οδός Ανέμων, Οικισμός Γαλήνη, 194 00",
    },
    mapsUrl: "https://maps.app.goo.gl/sEp6daE3wwtVTC3N6",
    dress: {
      en: "Drinks, dinner and dancing to the wee hours :)",
      el: "Γλέντι μέχρι το πρωί :)",
    },
    note: {
      en: "We look forward to celebrating with you after the ceremony!",
      el: "Ανυπομονούμε να γιορτάσουμε μαζί σας μετά την τελετή!",
    },
    ceremony: false,
  },
];

function EventsSection() {
  const { language } = useLanguage();

  return (
    <PageShell
      id="events"
      theme="events"
      eyebrow={language === "en" ? "The Day" : "Η μέρα μας"}
      title={
        <>
          {language === "en" ? (
            <>
              Saturday, 25<sup className="text-3xl">th</sup> July
            </>
          ) : (
            "Σάββατο, 25 Ιουλίου"
          )}
        </>
      }
      subtitle={
        language === "en"
          ? "You are cordially invited to the wedding of Petros & Nikki in Athens, Greece."
          : "Με μεγάλη χαρά σας προσκαλούμε στον γάμο του Πέτρου και της Νίκης στην Αθήνα."
      }
    >
      <div className="space-y-8 mt-8">
        {events.map((e) => (
          <article
            key={typeof e.title === "string" ? e.title : e.title.en}
            className="relative bg-cream/70 backdrop-blur-sm border border-olive/20 p-8 md:p-12"
          >
            <p className="eyebrow">{typeof e.time === "string" ? e.time : e.time[language]}</p>
            <h3 className="display-serif text-4xl md:text-5xl text-olive mt-3">
              {typeof e.title === "string" ? e.title : e.title[language]}
            </h3>
            <div className="mt-6 grid sm:grid-cols-2 gap-5 text-foreground/80">
              <div className="flex gap-3">
                <a
                  href={e.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${language === "en" ? "Open" : "Άνοιγμα"} ${
                    typeof e.venue === "string" ? e.venue : e.venue[language]
                  } ${language === "en" ? "in Google Maps" : "στο Google Maps"}`}
                  className="mt-1 shrink-0 text-olive transition-colors hover:text-olive/75"
                >
                  <MapPin size={18} aria-hidden="true" />
                </a>
                <div>
                  <a
                    href={e.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-olive transition-colors hover:text-olive/75"
                  >
                    {typeof e.venue === "string" ? e.venue : e.venue[language]}
                  </a>
                  <p className="text-sm">
                    {typeof e.address === "string" ? e.address : e.address[language]}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock size={18} className="text-olive shrink-0 mt-1" />
                <p className="text-sm">
                  {e.ceremony
                    ? language === "en"
                      ? `Begins at ${e.time}`
                      : `Ξεκινά στις ${e.time}`
                    : typeof e.time === "string"
                      ? e.time
                      : e.time[language]}
                </p>
              </div>
              <div className="flex gap-3 sm:col-span-2">
                {e.ceremony ? (
                  <Clock size={18} className="text-olive shrink-0 mt-1" aria-hidden="true" />
                ) : (
                  <Wine size={18} className="text-olive shrink-0 mt-1" aria-hidden="true" />
                )}
                <p className="text-sm">{e.dress[language]}</p>
              </div>
            </div>
            <p className="display-italic text-lg text-olive/80 mt-8 border-t border-olive/15 pt-6">
              {e.note[language]}
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

const musicBlockCopy: Record<
  Language,
  Record<MusicBlockReason, { title: string; message: string }>
> = {
  en: {
    invalid_code: {
      title: "We need your invitation code",
      message: "Enter the code from your invitation after you have RSVP'd yes.",
    },
    rsvp_required: {
      title: "RSVP first, then send us your song",
      message: "Music requests open after you submit an attending RSVP.",
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
  },
  el: {
    invalid_code: {
      title: "Βάλτε τον κωδικό της πρόσκλησής σας",
      message: "Γράψτε τον κωδικό από την πρόσκληση, αφού πρώτα έχετε απαντήσει ότι θα έρθετε.",
    },
    rsvp_required: {
      title: "Πρώτα η απάντηση, μετά το τραγούδι",
      message: "Η φόρμα για τραγούδια ανοίγει αφού απαντήσετε ότι θα έρθετε.",
    },
    maybe: {
      title: "Επιβεβαιώστε μας πρώτα",
      message: "Μόλις μας πείτε σίγουρα ότι θα έρθετε, θα μπορείτε να στείλετε τραγούδια.",
    },
    not_attending: {
      title: "Θα μας λείψετε στην πίστα",
      message:
        "Λυπούμαστε που δεν θα τα καταφέρετε. Τα τραγούδια είναι για τους καλεσμένους που θα είναι μαζί μας εκείνη τη μέρα, αλλά πείτε μας αν αλλάξει κάτι.",
    },
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

function musicUsageMessage(usage: MusicRequestUsage, language: Language) {
  const requestLabel = usage.submitted === 1 ? "request" : "requests";
  const leftLabel = usage.left === 1 ? "request" : "requests";

  if (language === "el") {
    return `Έχετε ήδη στείλει ${usage.submitted} ${usage.submitted === 1 ? "τραγούδι" : "τραγούδια"}. Απομένουν ${usage.left}.`;
  }

  return `You have already submitted ${usage.submitted} music ${requestLabel}. You have ${usage.left} ${leftLabel} left.`;
}

function MusicSection({ inviteCode, refreshKey }: { inviteCode: string; refreshKey: number }) {
  const { language, translateValidation } = useLanguage();
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
      toast.error(
        language === "en"
          ? "Could not validate invite code."
          : "Δεν μπορέσαμε να ελέγξουμε τον κωδικό.",
      );
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
      toast.error(translateValidation(parsed.error.issues[0]?.message ?? "Invalid input"));
      return;
    }
    if (status !== "ready") {
      toast.error(
        language === "en"
          ? "Validate your invite code before requesting music."
          : "Ελέγξτε πρώτα τον κωδικό πρόσκλησης.",
      );
      return;
    }
    if (musicUsage.left <= 0) {
      toast.error(
        language === "en"
          ? "This invite code already reached the 3 music-request limit."
          : "Αυτός ο κωδικός έχει ήδη φτάσει το όριο των 3 τραγουδιών.",
      );
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
      toast.success(language === "en" ? "Added to the playlist." : "Το προσθέσαμε στη λίστα.");
      form.reset();
    } catch (error) {
      console.error(error);

      if (error instanceof Error && error.message === "song_request_limit_reached") {
        setMusicUsage((current) => ({
          ...current,
          submitted: current.limit,
          left: 0,
        }));
        toast.error(
          language === "en"
            ? "This invite code already reached the 3 music-request limit."
            : "Αυτός ο κωδικός έχει ήδη φτάσει το όριο των 3 τραγουδιών.",
        );
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
        toast.error(
          language === "en"
            ? "Could not save your request. Please try again."
            : "Δεν μπορέσαμε να αποθηκεύσουμε το τραγούδι. Δοκιμάστε ξανά.",
        );
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
    // validateCode intentionally stays outside the dependency list so changing
    // language does not re-run invite validation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteCode, refreshKey]);

  const blockCopy = musicBlockCopy[language][blockReason];
  const showMusicCodeField =
    status !== "invalid" || !["rsvp_required", "maybe", "not_attending"].includes(blockReason);

  return (
    <PageShell
      id="music"
      theme="music"
      eyebrow={language === "en" ? "Music" : "Μουσική"}
      title={language === "en" ? "Keep us dancing" : "Κρατήστε την πίστα γεμάτη"}
      subtitle={
        language === "en"
          ? "What song will get you on the dance floor? Tell us — we’ll make sure the DJ knows."
          : "Ποιό τραγούδι θα σας σηκώσει για χορό; Πείτε μας και θα φροντίσουμε να το μάθει ο DJ."
      }
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
                <span className="eyebrow block mb-2">
                  {language === "en" ? "Invitation code" : "Κωδικός πρόσκλησης"}
                </span>
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
            {status === "invalid" && blockReason !== "not_attending" && (
              <div
                id="music-code-error"
                className={`border px-4 py-3 text-sm text-foreground/75 ${
                  blockReason === "rsvp_required" || blockReason === "maybe"
                    ? "border-olive/25 bg-olive/5"
                    : "border-coral/25 bg-coral/5"
                }`}
                role="alert"
              >
                {blockReason === "rsvp_required" || blockReason === "maybe" ? (
                  <div className="flex justify-center">
                    <a
                      href="#rsvp"
                      className="inline-flex items-center justify-center border border-olive/40 px-4 py-2 text-xs tracking-[0.15em] uppercase text-olive hover:bg-olive/5 transition"
                    >
                      {blockReason === "maybe"
                        ? language === "en"
                          ? "Update RSVP"
                          : "Ενημέρωση RSVP"
                        : language === "en"
                          ? "Go to RSVP"
                          : "Πηγαίνετε στο RSVP"}
                    </a>
                  </div>
                ) : (
                  <p>
                    {language === "en"
                      ? "Please check the code and try again after your attending RSVP has been submitted."
                      : "Ελέγξτε τον κωδικό και δοκιμάστε ξανά αφού απαντήσετε ότι θα έρθετε."}
                  </p>
                )}
              </div>
            )}
            {showMusicCodeField && (
              <button
                type="submit"
                className="w-full bg-olive text-cream py-3.5 text-sm tracking-[0.2em] uppercase rounded-sm hover:bg-olive/90 transition"
              >
                {status === "validating"
                  ? language === "en"
                    ? "Checking code..."
                    : "Έλεγχος κωδικού..."
                  : language === "en"
                    ? "Unlock music requests"
                    : "Άνοιγμα φόρμας τραγουδιών"}
              </button>
            )}
          </form>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="bg-cream/70 backdrop-blur-sm border border-olive/20 p-8 md:p-10 max-w-xl mx-auto mt-6 space-y-5"
        >
          <p className="text-sm text-foreground/75">{musicUsageMessage(musicUsage, language)}</p>
          {musicUsage.left <= 0 ? (
            <div className="border border-olive/25 bg-olive/5 px-4 py-3 text-sm text-foreground/75">
              {language === "en"
                ? `You have reached the maximum of ${musicUsage.limit} music requests for this invitation.`
                : `Έχετε φτάσει το όριο των ${musicUsage.limit} τραγουδιών για αυτή την πρόσκληση.`}
            </div>
          ) : (
            <>
              <Field
                name="song_title"
                label={language === "en" ? "Song title" : "Τίτλος τραγουδιού"}
              />
              <Field
                name="artist"
                label={language === "en" ? "Band / artist" : "Καλλιτέχνης / συγκρότημα"}
              />
            </>
          )}
          {songRequests.length > 0 && (
            <SongRequestList requests={songRequests} language={language} />
          )}
          {musicUsage.left > 0 && (
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-olive text-cream py-3 text-sm tracking-[0.2em] uppercase rounded-sm hover:bg-olive/90 transition disabled:opacity-50"
            >
              <Music size={16} />
              {submitting
                ? language === "en"
                  ? "Adding..."
                  : "Προσθήκη..."
                : language === "en"
                  ? "Add to playlist"
                  : "Προσθήκη στη λίστα"}
            </button>
          )}
        </form>
      )}
    </PageShell>
  );
}

function SongRequestList({
  requests,
  language,
}: {
  requests: SubmittedSongRequest[];
  language: Language;
}) {
  return (
    <section className="border border-olive/15 bg-olive/5 px-4 py-4">
      <h3 className="eyebrow mb-3">
        {language === "en" ? "Your music requests" : "Οι μουσικές προτάσεις σας"}
      </h3>
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
              <span className="text-foreground/60"> {language === "en" ? "by" : "από"} </span>
              <span>{request.artist}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------- Gifts ---------------- */
type GiftRevealStatus = "idle" | "revealing" | "revealed" | "invalid";

type RevealedGiftDetails = {
  uk: Extract<RevealGiftDetailsResponse, { ok: true; region: "uk" }> | null;
  greece: Extract<RevealGiftDetailsResponse, { ok: true; region: "greece" }> | null;
};

const giftRegions: Array<{ value: GiftRegion; label: Record<Language, string> }> = [
  { value: "uk", label: { en: "UK/GBP", el: "UK/GBP" } },
  { value: "greece", label: { en: "Greece/EURO", el: "Ελλάδα/EURO" } },
];

const giftReferenceCopy: Record<Language, string> = {
  en: "Please leave a reference or we won't know who to thank :)",
  el: "Παρακαλούμε γράψτε μια αιτιολογία/μήνυμα για να ξέρουμε ποιον να ευχαριστήσουμε :)",
};

function GiftsSection({ inviteCode }: { inviteCode: string }) {
  const { language, translateValidation } = useLanguage();
  const urlCodeIsValid = inviteCodeSchema.safeParse(inviteCode).success;
  const [manualCode, setManualCode] = useState(inviteCode);
  const [status, setStatus] = useState<GiftRevealStatus>("idle");
  const [revealedDetails, setRevealedDetails] = useState<RevealedGiftDetails>({
    uk: null,
    greece: null,
  });
  const [copiedGiftField, setCopiedGiftField] = useState<string | null>(null);

  useEffect(() => {
    if (urlCodeIsValid) {
      setManualCode(inviteCode);
      setStatus("idle");
      setRevealedDetails({ uk: null, greece: null });
      setCopiedGiftField(null);
      return;
    }

    setManualCode("");
    setStatus("idle");
    setRevealedDetails({ uk: null, greece: null });
    setCopiedGiftField(null);
  }, [inviteCode, urlCodeIsValid]);

  async function revealGiftDetails(rawCode: string, showValidationToast = true) {
    const parsed = inviteCodeSchema.safeParse(rawCode);

    if (!parsed.success) {
      setStatus("invalid");
      setRevealedDetails({ uk: null, greece: null });
      setCopiedGiftField(null);
      if (showValidationToast) {
        toast.error(
          translateValidation(parsed.error.issues[0]?.message ?? "Enter a valid invitation code."),
        );
      }
      return;
    }

    setManualCode(parsed.data);
    setStatus("revealing");
    setRevealedDetails({ uk: null, greece: null });
    setCopiedGiftField(null);

    try {
      const [ukDetails, greeceDetails] = await Promise.all(
        giftRegions.map(({ value }) =>
          callFunction<RevealGiftDetailsResponse>("reveal-gift-details", {
            code: parsed.data,
            region: value,
          }),
        ),
      );

      if (!ukDetails.ok || !greeceDetails.ok) {
        throw new Error("Gift details could not be revealed.");
      }

      setRevealedDetails({
        uk: ukDetails.region === "uk" ? ukDetails : null,
        greece: greeceDetails.region === "greece" ? greeceDetails : null,
      });
      setStatus("revealed");
    } catch (error) {
      console.error(error);
      setStatus("invalid");
      toast.error(
        language === "en"
          ? "Could not reveal those details. Please check your invitation code."
          : "Δεν μπορέσαμε να εμφανίσουμε τα στοιχεία. Ελέγξτε τον κωδικό της πρόσκλησης.",
      );
    }
  }

  useEffect(() => {
    if (urlCodeIsValid) {
      void revealGiftDetails(inviteCode, false);
    }
    // revealGiftDetails intentionally stays outside the dependency list so changing
    // language does not re-run gift detail validation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteCode, urlCodeIsValid]);

  function onReveal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    void revealGiftDetails(manualCode);
  }

  async function copyGiftField(field: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedGiftField(field);
      window.setTimeout(() => {
        setCopiedGiftField((current) => (current === field ? null : current));
      }, 1800);
    } catch (error) {
      console.error(error);
      toast.error(
        language === "en" ? "Could not copy that field." : "Δεν μπορέσαμε να το αντιγράψουμε.",
      );
    }
  }

  return (
    <PageShell
      id="gifts"
      theme="gifts"
      eyebrow={language === "en" ? "With Love" : undefined}
      title={language === "en" ? "A little note on gifts" : "Προαιρετική Λίστα Γάμου"}
      subtitle={
        language === "en" ? "Your presence at our wedding is the greatest gift of all." : undefined
      }
    >
      <div className="bg-cream/70 backdrop-blur-sm border border-olive/20 p-10 md:p-14 text-center max-w-2xl mx-auto mt-6">
        <Heart size={28} className="mx-auto text-coral" strokeWidth={1.5} />
        {language === "en" && (
          <>
            <p className="display-italic text-2xl md:text-3xl text-olive mt-6 leading-relaxed">
              If you wish to honour us with a gift, a contribution to starting our new life together would mean the world :)
            </p>
          </>
        )}
        <form onSubmit={onReveal} className="mt-12 space-y-6" noValidate>
          {!urlCodeIsValid && (
            <div className="space-y-5">
              <label className="block text-left">
                <span className="eyebrow block mb-2">
                  {language === "en" ? "Invitation code" : "Κωδικός πρόσκλησης"}
                </span>
                <input
                  name="gift-code"
                  value={manualCode}
                  onChange={(event) => {
                    setManualCode(event.target.value);
                    setStatus("idle");
                    setRevealedDetails({ uk: null, greece: null });
                    setCopiedGiftField(null);
                  }}
                  autoComplete="off"
                  aria-invalid={status === "invalid"}
                  aria-describedby={status === "invalid" ? "gift-code-error" : undefined}
                  placeholder="w-xxxxxxxx"
                  className="w-full bg-transparent border-b border-olive/30 focus:border-olive outline-none py-3 text-foreground placeholder:text-muted-foreground"
                />
              </label>

              <button
                type="submit"
                disabled={status === "revealing"}
                className="w-full inline-flex items-center justify-center gap-2 bg-olive text-cream py-3.5 text-sm tracking-[0.2em] uppercase rounded-sm hover:bg-olive/90 transition disabled:opacity-50"
              >
                {status === "revealing" ? <LockKeyhole size={16} /> : <Eye size={16} />}
                {status === "revealing"
                  ? language === "en"
                    ? "Checking code..."
                    : "Έλεγχος κωδικού..."
                  : language === "en"
                    ? "Reveal gift details"
                    : "Εμφάνιση στοιχείων"}
              </button>
            </div>
          )}

          {status === "invalid" && (
            <div
              id="gift-code-error"
              className="border border-coral/25 bg-coral/5 px-4 py-3 text-sm text-foreground/75"
              role="alert"
            >
              {language === "en"
                ? "Please check the code from your invitation and try again."
                : "Ελέγξτε τον κωδικό από την πρόσκλησή σας και δοκιμάστε ξανά."}
            </div>
          )}
        </form>

        {status === "revealed" && (
          <div className="mt-10 space-y-8 text-left">
            <section>
              <h3 className="display-serif mb-3 px-1 text-2xl text-olive">
                {giftRegions[0].label[language]}
              </h3>
              {revealedDetails.uk && (
                <dl className="space-y-3 border border-olive/20 bg-olive/5 p-4">
                  <CopyableGiftField
                    label={language === "en" ? "Account name" : "Όνομα λογαριασμού"}
                    value={revealedDetails.uk.bankDetails.accountName}
                    fieldId="uk-accountName"
                    copiedField={copiedGiftField}
                    onCopy={copyGiftField}
                  />
                  <CopyableGiftField
                    label={language === "en" ? "Sort code" : "Sort code"}
                    value={revealedDetails.uk.bankDetails.sortCode}
                    fieldId="uk-sortCode"
                    copiedField={copiedGiftField}
                    onCopy={copyGiftField}
                  />
                  <CopyableGiftField
                    label={language === "en" ? "Account number" : "Αριθμός λογαριασμού"}
                    value={revealedDetails.uk.bankDetails.accountNumber}
                    fieldId="uk-accountNumber"
                    copiedField={copiedGiftField}
                    onCopy={copyGiftField}
                  />
                  <CopyableGiftField
                    label={language === "en" ? "Reference" : "Αιτιολογία / μήνυμα"}
                    value={giftReferenceCopy[language]}
                    fieldId="uk-reference"
                    copiedField={copiedGiftField}
                    onCopy={copyGiftField}
                  />
                </dl>
              )}
            </section>

            <section>
              <h3 className="display-serif mb-3 px-1 text-2xl text-olive">
                {giftRegions[1].label[language]}
              </h3>
              {revealedDetails.greece && (
                <div className="border border-olive/20 bg-olive/5 p-4">
                  <p className="display-serif text-xl text-olive text-center">
                    {language === "en"
                      ? revealedDetails.greece.message
                      : "Θα προστεθούν περισσότερες λεπτομέρειες σύντομα"}
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function CopyableGiftField({
  label,
  value,
  fieldId,
  copiedField,
  onCopy,
}: {
  label: string;
  value: string;
  fieldId: string;
  copiedField: string | null;
  onCopy: (field: string, value: string) => void;
}) {
  const copied = copiedField === fieldId;
  const { language } = useLanguage();

  return (
    <div className="flex items-start justify-between gap-3 border-b border-olive/15 pb-3 last:border-b-0 last:pb-0">
      <div className="min-w-0">
        <dt className="eyebrow">{label}</dt>
        <dd className="mt-1 break-words text-base text-olive">{value}</dd>
      </div>
      <button
        type="button"
        onClick={() => onCopy(fieldId, value)}
        aria-label={`${language === "en" ? "Copy" : "Αντιγραφή"} ${label}`}
        className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center border border-olive/30 text-olive transition hover:bg-olive/5"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

/* ---------------- FAQ ---------------- */
const faqs = [
  {
    q: {
      en: "When should I RSVP by?",
      el: "Μέχρι πότε πρέπει να απαντήσω στο RSVP;",
    },
    a: {
      en: ["Please RSVP by 15th June 2026 so we can finalise numbers with our venues."],
      el: [
        "Παρακαλούμε απαντήστε έως τις 15 Ιουνίου 2026, για να κλείσουμε τον τελικό αριθμό ατόμων με τους χώρους.",
      ],
    },
  },
  {
    q: {
      en: "Can I bring a plus-one?",
      el: "Μπορώ να φέρω συνοδό;",
    },
    a: {
      en: [
        "Of course! Please add their details and RSVP on their behalf using the “Add guests” button.",
        "The same applies for families: please RSVP for your whole group in this way.",
      ],
      el: [
        "Φυσικά! Προσθέστε τα στοιχεία τους και απαντήστε εκ μέρους τους με το κουμπί «Προσθήκη καλεσμένου».",
        "Το ίδιο ισχύει και για οικογένειες: απαντήστε με τον ίδιο τρόπο για όλη την παρέα ή οικογένειά σας.",
      ],
    },
  },
  {
    q: {
      en: "Are children welcome?",
      el: "Είναι ευπρόσδεκτα τα παιδιά;",
    },
    a: {
      en: [
        "Of course! Please include each child’s age in the RSVP section, as this will help the venue accommodate your needs.",
      ],
      el: [
        "Φυσικά! Γράψτε την ηλικία κάθε παιδιού στο RSVP, για να μπορέσει ο χώρος να σας εξυπηρετήσει καλύτερα.",
      ],
    },
  },
  {
    q: {
      en: "What time should I arrive?",
      el: "Τι ώρα πρέπει να φτάσω;",
    },
    a: {
      en: ["Please arrive at the church at 19:15, as the ceremony will begin at 19:30."],
      el: [
        "Παρακαλούμε να φτάσετε στην εκκλησία στις 19:15, καθώς η τελετή θα ξεκινήσει στις 19:30.",
      ],
    },
  },
  {
    q: {
      en: "What is the dress code?",
      el: "Υπάρχει dress code;",
    },
    a: {
      en: [
        "There is no dress code. Wear whatever you like :) It will be hot, so please keep this in mind.",
      ],
      el: [
        "Δεν υπάρχει dress code. Φορέστε ό,τι σας αρέσει :) Θα έχει ζέστη, οπότε έχετε το υπόψη.",
      ],
    },
  },
  {
    q: {
      en: "Where should I stay?",
      el: "Πού να μείνω;",
    },
    a: {
      en: [
        "For guests who want to get around by car, or stay somewhere by the sea, the coastline south of Glyfada is beautiful.",
        "Some guests may prefer to stay in central Athens to make the most of sightseeing and experience the hustle and bustle of the city. From there, getting around by public transport and taxi is very feasible. Glyfada is connected to the centre by tram and is also very accessible by taxi.",
      ],
      el: [
        "Αν θα μετακινείστε με αυτοκίνητο ή θέλετε να μείνετε κοντά στη θάλασσα, η ακτογραμμή νότια της Γλυφάδας είναι πολύ όμορφη.",
        "Άλλοι ίσως προτιμήσουν το κέντρο της Αθήνας για βόλτες, αξιοθέατα και τον ρυθμό της πόλης. Από εκεί, οι μετακινήσεις με μέσα μαζικής μεταφοράς και ταξί είναι αρκετά εύκολες. Η Γλυφάδα συνδέεται με το κέντρο με τραμ και είναι επίσης εύκολα προσβάσιμη με ταξί.",
      ],
    },
  },
  {
    q: {
      en: "How do I get between the venues?",
      el: "Πώς μετακινούμαι ανάμεσα στους χώρους;",
    },
    a: {
      en: [
        "By car or taxi. The reception venue is around a 20-minute drive from the church.",
        "Many guests will be bringing cars. If you do not have a car or a guaranteed ride, please let either Petro or Nikki know directly and we can find a solution based on numbers :)",
      ],
      el: [
        "Με αυτοκίνητο ή ταξί. Ο χώρος της δεξίωσης είναι περίπου 20 λεπτά με το αυτοκίνητο από την εκκλησία.",
        "Πολλοί καλεσμένοι θα έχουν αυτοκίνητο. Αν δεν έχετε δικό σας ή σίγουρη μεταφορά, ενημερώστε απευθείας τον Πέτρο ή τη Nikki και θα βρούμε λύση :)",
      ],
    },
  },
];

function FaqSection() {
  const { language } = useLanguage();

  return (
    <PageShell
      id="faq"
      theme="faq"
      eyebrow={language === "en" ? "Good to Know" : "Χρήσιμες πληροφορίες"}
      title={language === "en" ? "FAQs" : "Συχνές Ερωτήσεις"}
      subtitle={
        language === "en"
          ? "Everything you might be wondering about our day."
          : "Όλα όσα μπορεί να αναρωτιέστε για την ημέρα μας."
      }
    >
      <Accordion
        type="single"
        collapsible
        className="bg-cream/70 backdrop-blur-sm border border-olive/20 px-6 md:px-10 py-2 mt-6"
      >
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`q-${i}`} className="border-olive/15">
            <AccordionTrigger className="text-left display-serif text-xl text-olive hover:no-underline py-5">
              {f.q[language]}
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-foreground/75 leading-relaxed pb-5">
              {f.a[language].map((paragraph) => (
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
