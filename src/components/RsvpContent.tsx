import { Link, useSearch } from "@tanstack/react-router";
import { AlertCircle, Check, Heart, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { callFunction } from "@/lib/functions";
import { useLanguage, type Language } from "@/lib/i18n";
import type {
  AttendanceStatus,
  InviteCodeStatus,
  SubmittedRsvpResponse,
  SubmitRsvpResponse,
  ValidateInviteResponse,
} from "@/lib/rsvp-types";
import { inviteCodeSchema, rsvpFormSchema } from "@/lib/rsvp-validation";

type RsvpStatus =
  | "idle"
  | "validating"
  | "invalid"
  | "ready"
  | "submitting"
  | "success"
  | "submitted"
  | "error";
type InvalidReason = Exclude<InviteCodeStatus, "valid"> | "invalid_format";
type FieldErrors = Partial<Record<string, string>>;
type GuestFormValue = { firstName: string; lastName: string; under13: boolean; age: string };
type AttendanceChoice = "yes" | "no" | "maybe";
type RsvpFormDefaults = {
  submitterFirstName: string;
  submitterLastName: string;
  email: string;
  phoneNumber: string;
};

const invalidCopy: Record<
  Language,
  Record<InvalidReason, { title: string; message: string; action: string }>
> = {
  en: {
    missing_code: {
      title: "We need your invitation code",
      message: "Enter the code from your invitation and we will find your RSVP form.",
      action: "Check code",
    },
    invalid_format: {
      title: "That code does not look right",
      message:
        "Invitation codes use lowercase words followed by the letters and numbers on your invite.",
      action: "Try another code",
    },
    not_found: {
      title: "We could not find that invitation",
      message: "Please check the code and try again. If it still does not work, send us a message.",
      action: "Try another code",
    },
    used: {
      title: "This RSVP has already been sent",
      message: "We have already received a response for this invitation code.",
      action: "Use a different code",
    },
    disabled: {
      title: "This invitation is not active",
      message: "This code has been disabled. Please contact us if you think this is a mistake.",
      action: "Use a different code",
    },
  },
  el: {
    missing_code: {
      title: "Βάλτε τον κωδικό της πρόσκλησής σας",
      message: "Γράψτε τον κωδικό που υπάρχει στην πρόσκληση για να ανοίξει η φόρμα RSVP.",
      action: "Έλεγχος κωδικού",
    },
    invalid_format: {
      title: "Ο κωδικός δεν φαίνεται σωστός",
      message:
        "Οι κωδικοί πρόσκλησης χρησιμοποιούν μικρές λέξεις και τα γράμματα/νούμερα της πρόσκλησής σας.",
      action: "Δοκιμάστε άλλον κωδικό",
    },
    not_found: {
      title: "Δεν βρήκαμε αυτή την πρόσκληση",
      message: "Ελέγξτε τον κωδικό και δοκιμάστε ξανά. Αν πάλι δεν λειτουργεί, στείλτε μας μήνυμα.",
      action: "Δοκιμάστε άλλον κωδικό",
    },
    used: {
      title: "Αυτό το RSVP έχει ήδη σταλεί",
      message: "Έχουμε ήδη λάβει απάντηση για τον συγκεκριμένο κωδικό πρόσκλησης.",
      action: "Χρήση άλλου κωδικού",
    },
    disabled: {
      title: "Αυτή η πρόσκληση δεν είναι ενεργή",
      message:
        "Ο κωδικός έχει απενεργοποιηθεί. Αν πιστεύετε ότι πρόκειται για λάθος, επικοινωνήστε μαζί μας.",
      action: "Χρήση άλλου κωδικού",
    },
  },
};

const rsvpCopy = {
  en: {
    pageEyebrow: "Kindly Respond",
    pageTitle: "RSVP",
    pageSubtitle: "Please aim to respond by 15th June 2026.",
    checkError: "We could not check your invitation code. Please try again.",
    codeFallback: "Enter a valid invitation code.",
    formFallback: "Please check the form.",
    sentToast: "Your RSVP has been sent.",
    submitError: "We could not send your RSVP. Please try again.",
    findTitle: "Find your invitation",
    findMessage: "Your personal code is printed on your invitation.",
    checkCode: "Check code",
  },
  el: {
    pageEyebrow: "Παρακαλούμε απαντήστε",
    pageTitle: "RSVP",
    pageSubtitle: "Παρακαλούμε απαντήστε μέχρι τις 15 Ιουνίου 2026.",
    checkError: "Δεν μπορέσαμε να ελέγξουμε τον κωδικό πρόσκλησης. Δοκιμάστε ξανά.",
    codeFallback: "Βάλτε έναν έγκυρο κωδικό πρόσκλησης.",
    formFallback: "Ελέγξτε λίγο τη φόρμα.",
    sentToast: "Λάβαμε την απάντησή σας.",
    submitError: "Δεν μπορέσαμε να στείλουμε την απάντησή σας. Δοκιμάστε ξανά.",
    findTitle: "Βρείτε την πρόσκλησή σας",
    findMessage: "Ο προσωπικός σας κωδικός είναι τυπωμένος πάνω στην πρόσκληση.",
    checkCode: "Έλεγχος κωδικού",
  },
};

function normalizeCode(value: string) {
  return value.trim().toLowerCase();
}

function formatSubmittedAt(value: string, language: Language) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language === "el" ? "el-GR" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function attendanceStatusToChoice(status: AttendanceStatus): AttendanceChoice {
  if (status === "attending") {
    return "yes";
  }

  if (status === "declined") {
    return "no";
  }

  return "maybe";
}

function attendanceChoiceToStatus(choice: FormDataEntryValue | null) {
  if (choice === "yes") {
    return "attending" satisfies AttendanceStatus;
  }

  if (choice === "no") {
    return "declined" satisfies AttendanceStatus;
  }

  if (choice === "maybe") {
    return "maybe" satisfies AttendanceStatus;
  }

  return undefined;
}

function getResponseAttendanceStatus(response: SubmittedRsvpResponse): AttendanceStatus {
  return response.attendanceStatus ?? (response.attending ? "attending" : "declined");
}

function defaultsFromRsvp(response: SubmittedRsvpResponse): RsvpFormDefaults {
  const submitter = response.guests.find((guest) => guest.isSubmitter);
  const nameParts = response.fullName.trim().split(/\s+/);

  return {
    submitterFirstName: submitter?.firstName ?? nameParts[0] ?? "",
    submitterLastName: submitter?.lastName ?? nameParts.slice(1).join(" "),
    email: response.email ?? "",
    phoneNumber: response.phoneNumber ?? "",
  };
}

function guestsFromRsvp(response: SubmittedRsvpResponse): GuestFormValue[] {
  return response.guests
    .filter((guest) => !guest.isSubmitter)
    .map((guest) => ({
      firstName: guest.firstName,
      lastName: guest.lastName,
      under13: guest.under13,
      age: guest.age === null ? "" : String(guest.age),
    }));
}

function getFieldErrors(error: {
  issues: Array<{ path: Array<string | number>; message: string }>;
}) {
  return error.issues.reduce<FieldErrors>((errors, issue) => {
    const field = issue.path.join(".");

    if (field) {
      errors[field] = issue.message;
    }

    return errors;
  }, {});
}

export function RsvpContent({
  initialCodeFromUrl = "",
  onRsvpSubmitted,
}: {
  initialCodeFromUrl?: string;
  onRsvpSubmitted?: (code: string) => void;
}) {
  const { language, translateValidation } = useLanguage();
  const copy = rsvpCopy[language];
  const initialCode = useMemo(() => normalizeCode(initialCodeFromUrl ?? ""), [initialCodeFromUrl]);
  const [status, setStatus] = useState<RsvpStatus>(initialCode ? "validating" : "idle");
  const [code, setCode] = useState(initialCode);
  const [manualCode, setManualCode] = useState(initialCode);
  const [invalidReason, setInvalidReason] = useState<InvalidReason>("missing_code");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [attending, setAttending] = useState<AttendanceChoice | null>(null);
  const [additionalGuests, setAdditionalGuests] = useState<GuestFormValue[]>([]);
  const [submittedRsvp, setSubmittedRsvp] = useState<SubmittedRsvpResponse | null>(null);
  const [formDefaults, setFormDefaults] = useState<RsvpFormDefaults | null>(null);
  const activeValidation = useRef(0);
  const submitInFlight = useRef(false);

  async function validateCode(rawCode: string) {
    const parsed = inviteCodeSchema.safeParse(rawCode);
    const normalizedCode = parsed.success ? parsed.data : normalizeCode(rawCode);

    setManualCode(normalizedCode);
    setCode(normalizedCode);
    setCodeError(null);
    setSubmittedRsvp(null);
    setFormDefaults(null);
    setAttending(null);
    setAdditionalGuests([]);

    if (!parsed.success) {
      setInvalidReason(rawCode.trim() ? "invalid_format" : "missing_code");
      setStatus("invalid");
      return;
    }

    const validationId = activeValidation.current + 1;
    activeValidation.current = validationId;
    setStatus("validating");

    try {
      const response = await callFunction<ValidateInviteResponse>("validate-invite", {
        code: normalizedCode,
        includeRsvpResponse: true,
      });

      if (validationId !== activeValidation.current) {
        return;
      }

      if (response.ok && response.valid) {
        setStatus("ready");
        return;
      }

      if (response.ok && !response.valid) {
        if (response.reason === "maybe" && response.rsvpResponse) {
          setSubmittedRsvp(response.rsvpResponse);
          setFormDefaults(defaultsFromRsvp(response.rsvpResponse));
          setAdditionalGuests(guestsFromRsvp(response.rsvpResponse));
          setAttending(
            attendanceStatusToChoice(getResponseAttendanceStatus(response.rsvpResponse)),
          );
          setStatus("ready");
          return;
        }

        if (response.reason === "used" && response.rsvpResponse) {
          setSubmittedRsvp(response.rsvpResponse);
          setStatus("submitted");
          return;
        }

        setInvalidReason(
          response.reason === "missing_code" ||
            response.reason === "not_found" ||
            response.reason === "used" ||
            response.reason === "disabled"
            ? response.reason
            : "not_found",
        );
        setStatus("invalid");
        return;
      }

      setStatus("error");
    } catch (error) {
      if (validationId !== activeValidation.current) {
        return;
      }

      console.error(error);
      setStatus("error");
      toast.error(copy.checkError);
    }
  }

  useEffect(() => {
    submitInFlight.current = false;

    if (!initialCode) {
      activeValidation.current += 1;
      setStatus("idle");
      setCode("");
      setManualCode("");
      setCodeError(null);
      setSubmittedRsvp(null);
      setFormDefaults(null);
      return;
    }

    void validateCode(initialCode);
    // validateCode intentionally stays outside the dependency list so changing
    // language does not reset an in-progress RSVP form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  function onManualCodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = inviteCodeSchema.safeParse(manualCode);

    if (!parsed.success) {
      setCodeError(translateValidation(parsed.error.issues[0]?.message ?? copy.codeFallback));
      setInvalidReason(manualCode.trim() ? "invalid_format" : "missing_code");
      setStatus(manualCode.trim() ? "invalid" : "idle");
      return;
    }

    void validateCode(parsed.data);
  }

  async function onRsvpSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status === "submitting" || submitInFlight.current) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const attendanceStatus = attendanceChoiceToStatus(formData.get("attending"));
    const parsed = rsvpFormSchema.safeParse({
      code,
      submitter: {
        firstName: formData.get("submitterFirstName"),
        lastName: formData.get("submitterLastName"),
      },
      attendanceStatus,
      email: formData.get("email"),
      phoneNumber: formData.get("phoneNumber"),
      guests: additionalGuests.map((guest) => ({
        ...guest,
        age: guest.under13 ? guest.age : undefined,
      })),
    });

    if (!parsed.success) {
      const errors = getFieldErrors(parsed.error);
      setFormErrors(
        Object.fromEntries(
          Object.entries(errors).map(([field, message]) => [
            field,
            translateValidation(message ?? copy.formFallback),
          ]),
        ),
      );
      toast.error(translateValidation(parsed.error.issues[0]?.message ?? copy.formFallback));
      return;
    }

    setFormErrors({});
    submitInFlight.current = true;
    setStatus("submitting");

    try {
      await callFunction<SubmitRsvpResponse>("submit-rsvp", {
        code: parsed.data.code,
        submitter: {
          ...parsed.data.submitter,
          under13: false,
          age: null,
        },
        attending: parsed.data.attendanceStatus === "attending",
        attendanceStatus: parsed.data.attendanceStatus,
        email: parsed.data.email ?? null,
        phoneNumber: parsed.data.phoneNumber ?? null,
        guests: parsed.data.guests.map((guest) => ({
          ...guest,
          age: guest.age ?? null,
        })),
      });

      setStatus("success");
      toast.success(copy.sentToast);
      onRsvpSubmitted?.(parsed.data.code);
      form.reset();
      setAdditionalGuests([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      if (message === "already_used") {
        submitInFlight.current = false;
        void validateCode(code);
        return;
      }

      if (message === "disabled_code") {
        submitInFlight.current = false;
        setInvalidReason("disabled");
        setStatus("invalid");
        return;
      }

      if (message === "invalid_code") {
        submitInFlight.current = false;
        setInvalidReason("not_found");
        setStatus("invalid");
        return;
      }

      console.error(error);
      submitInFlight.current = false;
      setStatus("ready");
      toast.error(copy.submitError);
    }
  }

  return (
    <div className="relative overflow-hidden">
      <PageShell
        id="rsvp"
        theme="rsvp"
        eyebrow={copy.pageEyebrow}
        title={copy.pageTitle}
        subtitle={copy.pageSubtitle}
      >
        <div className="bg-cream/70 backdrop-blur-sm border border-olive/20 p-8 md:p-12 max-w-2xl mx-auto mt-6">
          {status === "idle" && (
            <CodePanel
              manualCode={manualCode}
              codeError={codeError}
              onChange={(value) => {
                setManualCode(value);
                setCodeError(null);
              }}
              onSubmit={onManualCodeSubmit}
              title={copy.findTitle}
              message={copy.findMessage}
              action={copy.checkCode}
            />
          )}

          {status === "validating" && <LoadingPanel />}

          {status === "invalid" && (
            <InvalidPanel
              reason={invalidReason}
              manualCode={manualCode}
              codeError={codeError}
              onChange={(value) => {
                setManualCode(value);
                setCodeError(null);
              }}
              onSubmit={onManualCodeSubmit}
            />
          )}

          {(status === "ready" || status === "submitting") && (
            <RsvpForm
              attending={attending}
              errors={formErrors}
              defaults={formDefaults}
              isMaybeUpdate={
                submittedRsvp ? getResponseAttendanceStatus(submittedRsvp) === "maybe" : false
              }
              submitting={status === "submitting"}
              onAttendingChange={setAttending}
              onSubmit={onRsvpSubmit}
              additionalGuests={additionalGuests}
              onAddGuest={() =>
                setAdditionalGuests((current) => [
                  ...current,
                  { firstName: "", lastName: "", under13: false, age: "" },
                ])
              }
              onRemoveGuest={(index) =>
                setAdditionalGuests((current) =>
                  current.filter((_, guestIndex) => guestIndex !== index),
                )
              }
              onGuestChange={(index, key, value) =>
                setAdditionalGuests((current) =>
                  current.map((guest, guestIndex) =>
                    guestIndex === index
                      ? {
                          ...guest,
                          [key]: value,
                          ...(key === "under13" && value === false ? { age: "" } : {}),
                        }
                      : guest,
                  ),
                )
              }
            />
          )}

          {status === "success" && <SuccessPanel attending={attending} />}

          {status === "submitted" && submittedRsvp && <SubmittedRsvpPanel rsvp={submittedRsvp} />}

          {status === "error" && (
            <ErrorPanel
              onRetry={() => {
                if (code) {
                  void validateCode(code);
                } else {
                  setStatus("idle");
                }
              }}
            />
          )}
        </div>
      </PageShell>
    </div>
  );
}

function CodePanel({
  manualCode,
  codeError,
  title,
  message,
  action,
  onChange,
  onSubmit,
}: {
  manualCode: string;
  codeError: string | null;
  title: string;
  message?: string;
  action: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const { language } = useLanguage();

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="text-center">
        <p className="display-serif text-3xl text-olive">{title}</p>
        {message ? <p className="mt-3 text-foreground/75">{message}</p> : null}
      </div>

      <label className="block">
        <span className="eyebrow block mb-2">
          {language === "en" ? "Invitation code" : "Κωδικός πρόσκλησης"}
        </span>
        <input
          name="code"
          value={manualCode}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(codeError)}
          aria-describedby={codeError ? "code-error" : undefined}
          autoComplete="off"
          className="w-full bg-transparent border-b border-olive/30 focus:border-olive outline-none py-3 text-foreground placeholder:text-muted-foreground"
          placeholder="bon-bon-baby-xxxxxxxxxx"
        />
      </label>
      {codeError && (
        <p id="code-error" className="text-sm text-destructive" role="alert">
          {codeError}
        </p>
      )}

      <button
        type="submit"
        className="w-full bg-olive text-cream py-3.5 text-sm tracking-[0.2em] uppercase rounded-sm hover:bg-olive/90 transition"
      >
        {action}
      </button>
    </form>
  );
}

function LoadingPanel() {
  const { language } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-12 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-olive" aria-hidden />
      <div>
        <p className="display-serif text-3xl text-olive">
          {language === "en" ? "Checking your invitation" : "Ελέγχουμε τον κωδικό σας"}
        </p>
        <p className="mt-3 text-foreground/75">
          {language === "en" ? "This should only take a moment." : "Δεν θα αργήσει."}
        </p>
      </div>
    </div>
  );
}

function InvalidPanel({
  reason,
  manualCode,
  codeError,
  onChange,
  onSubmit,
}: {
  reason: InvalidReason;
  manualCode: string;
  codeError: string | null;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const { language } = useLanguage();
  const copy = invalidCopy[language][reason];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-coral" aria-hidden />
        <p className="display-serif text-3xl text-olive mt-5">{copy.title}</p>
        <p className="mt-3 text-foreground/75">{copy.message}</p>
      </div>
      <CodePanel
        manualCode={manualCode}
        codeError={codeError}
        onChange={onChange}
        onSubmit={onSubmit}
        title={language === "en" ? "Try your code again" : "Ξαναδοκιμάστε τον κωδικό σας"}
        action={copy.action}
      />
    </div>
  );
}

function RsvpForm({
  attending,
  errors,
  defaults,
  isMaybeUpdate,
  submitting,
  onAttendingChange,
  onSubmit,
  additionalGuests,
  onAddGuest,
  onRemoveGuest,
  onGuestChange,
}: {
  attending: AttendanceChoice | null;
  errors: FieldErrors;
  defaults: RsvpFormDefaults | null;
  isMaybeUpdate: boolean;
  submitting: boolean;
  additionalGuests: GuestFormValue[];
  onAttendingChange: (value: AttendanceChoice) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onAddGuest: () => void;
  onRemoveGuest: (index: number) => void;
  onGuestChange: (
    index: number,
    key: "firstName" | "lastName" | "under13" | "age",
    value: string | boolean,
  ) => void;
}) {
  const { language } = useLanguage();
  const guestCount = 1 + additionalGuests.length;

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {isMaybeUpdate && (
        <div className="border border-olive/20 bg-olive/5 p-4 text-sm text-foreground/75">
          {language === "en"
            ? "Your RSVP is currently marked as very likely. You can update it to accept or decline when you know."
            : "Η απάντησή σας είναι προς το παρόν «μάλλον ναι». Μπορείτε να την αλλάξετε όταν είστε σίγουροι/ες."}
        </div>
      )}
      <fieldset>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            name="submitterFirstName"
            label={language === "en" ? "First name" : "Όνομα"}
            error={errors["submitter.firstName"]}
            defaultValue={defaults?.submitterFirstName ?? ""}
            autoComplete="given-name"
            required
          />
          <Input
            name="submitterLastName"
            label={language === "en" ? "Last name" : "Επώνυμο"}
            error={errors["submitter.lastName"]}
            defaultValue={defaults?.submitterLastName ?? ""}
            autoComplete="family-name"
            required
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-3">
          {language === "en" ? "Contact details" : "Στοιχεία επικοινωνίας"}
        </legend>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            name="email"
            type="email"
            label={language === "en" ? "Email (optional)" : "Email (προαιρετικό)"}
            error={errors.email}
            defaultValue={defaults?.email ?? ""}
            autoComplete="email"
          />
          <Input
            name="phoneNumber"
            type="tel"
            label={language === "en" ? "Phone number (optional)" : "Τηλέφωνο (προαιρετικό)"}
            error={errors.phoneNumber}
            defaultValue={defaults?.phoneNumber ?? ""}
            autoComplete="tel"
          />
        </div>
      </fieldset>

      <fieldset aria-describedby={errors.attendanceStatus ? "attending-error" : undefined}>
        <legend className="eyebrow mb-3">
          {language === "en" ? "Will you be attending?" : "Θα παρευρεθείτε;"}
        </legend>
        <div className="grid sm:grid-cols-3 gap-3">
          <RadioCard
            name="attending"
            value="yes"
            label={language === "en" ? "Accept" : "Θα έρθω"}
            checked={attending === "yes"}
            onChange={() => onAttendingChange("yes")}
            required
          />
          <RadioCard
            name="attending"
            value="no"
            label={language === "en" ? "Decline" : "Δεν θα μπορέσω"}
            checked={attending === "no"}
            onChange={() => onAttendingChange("no")}
            required
          />
          <RadioCard
            name="attending"
            value="maybe"
            label={
              language === "en"
                ? "Very likely, will confirm soon"
                : "Μάλλον ναι, θα επιβεβαιώσω σύντομα"
            }
            checked={attending === "maybe"}
            onChange={() => onAttendingChange("maybe")}
            required
          />
        </div>
        {errors.attendanceStatus && (
          <p id="attending-error" className="mt-2 text-sm text-destructive" role="alert">
            {errors.attendanceStatus}
          </p>
        )}
      </fieldset>

      <fieldset aria-describedby={errors.guests ? "guest-count-error" : undefined}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <legend className="eyebrow">{language === "en" ? "RSVP list" : "Καλεσμένοι"}</legend>
          <button
            type="button"
            onClick={onAddGuest}
            disabled={guestCount >= 10}
            className="text-xs tracking-[0.15em] uppercase border border-olive/35 px-3 py-2 text-olive hover:bg-olive/5 transition disabled:opacity-50"
          >
            {language === "en" ? "Add guest" : "Προσθήκη καλεσμένου"}
          </button>
        </div>
        <p className="text-sm text-foreground/70">
          {language === "en" ? "Total guests" : "Σύνολο καλεσμένων"}: {guestCount}
        </p>
        <div className="mt-3 space-y-3">
          {additionalGuests.map((guest, index) => (
            <div key={index} className="space-y-3 border border-olive/20 p-3 rounded-sm">
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  value={guest.firstName}
                  onChange={(event) => onGuestChange(index, "firstName", event.target.value)}
                  aria-invalid={Boolean(errors[`guests.${index}.firstName`])}
                  className="w-full bg-transparent border-b border-olive/30 focus:border-olive outline-none py-3 text-foreground placeholder:text-muted-foreground"
                  placeholder={language === "en" ? "First name" : "Όνομα"}
                  required
                />
                <input
                  value={guest.lastName}
                  onChange={(event) => onGuestChange(index, "lastName", event.target.value)}
                  aria-invalid={Boolean(errors[`guests.${index}.lastName`])}
                  className="w-full bg-transparent border-b border-olive/30 focus:border-olive outline-none py-3 text-foreground placeholder:text-muted-foreground"
                  placeholder={language === "en" ? "Last name" : "Επώνυμο"}
                  required
                />
              </div>
              {(errors[`guests.${index}.firstName`] || errors[`guests.${index}.lastName`]) && (
                <p className="text-sm text-destructive" role="alert">
                  {errors[`guests.${index}.firstName`] || errors[`guests.${index}.lastName`]}
                </p>
              )}
              <GuestAgeFields
                idPrefix={`guest-${index}`}
                under13={guest.under13}
                age={guest.age}
                ageError={errors[`guests.${index}.age`]}
                onUnder13Change={(checked) => onGuestChange(index, "under13", checked)}
                onAgeChange={(value) => onGuestChange(index, "age", value)}
              />
              <button
                type="button"
                onClick={() => onRemoveGuest(index)}
                className="text-xs tracking-[0.15em] uppercase border border-coral/45 px-3 py-2 text-coral hover:bg-coral/5 transition"
              >
                {language === "en" ? "Remove" : "Αφαίρεση"}
              </button>
            </div>
          ))}
        </div>
        {errors.guests && (
          <p id="guest-count-error" className="mt-2 text-sm text-destructive" role="alert">
            {errors.guests}
          </p>
        )}
      </fieldset>

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 bg-olive text-cream py-3.5 text-sm tracking-[0.2em] uppercase rounded-sm hover:bg-olive/90 transition disabled:opacity-50"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {submitting
          ? language === "en"
            ? "Sending..."
            : "Αποστολή..."
          : isMaybeUpdate
            ? language === "en"
              ? "Update RSVP"
              : "Ενημέρωση RSVP"
            : language === "en"
              ? "Send RSVP"
              : "Αποστολή RSVP"}
      </button>
    </form>
  );
}

function SuccessPanel({ attending }: { attending: AttendanceChoice | null }) {
  const { language } = useLanguage();
  const isAttending = attending === "yes";
  const isMaybe = attending === "maybe";
  const title = isMaybe
    ? language === "en"
      ? "Thanks for letting us know"
      : "Ευχαριστούμε που μας ενημερώσατε"
    : isAttending
      ? language === "en"
        ? "We can't wait"
        : "Ανυπομονούμε"
      : language === "en"
        ? "We'll miss you"
        : "Θα μας λείψετε";
  const message = isMaybe
    ? language === "en"
      ? "We have marked you as very likely. Use your invitation code again when you are ready to accept or decline."
      : "Κρατήσαμε την απάντησή σας ως «μάλλον ναι». Όταν είστε σίγουροι/ες, βάλτε ξανά τον κωδικό σας για να την αλλάξετε."
    : isAttending
      ? language === "en"
        ? "Your RSVP has been received. See you on 25 July in Athens."
        : "Λάβαμε την απάντησή σας. Τα λέμε στις 25 Ιουλίου στην Αθήνα."
      : language === "en"
        ? "Thank you for letting us know. We will be thinking of you."
        : "Ευχαριστούμε που μας ενημερώσατε. Θα σας έχουμε στη σκέψη μας.";

  return (
    <div className="text-center py-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-olive text-cream">
        <Check className="h-6 w-6" aria-hidden />
      </div>
      <p className="display-serif text-4xl text-olive mt-6">{title}</p>
      <p className="mt-4 text-foreground/75">{message}</p>
      {!isMaybe && (
        <p className="mt-5 text-sm text-foreground/65">
          {language === "en"
            ? "If you need to change anything, please contact Petros directly."
            : "Αν χρειαστεί να αλλάξετε κάτι, επικοινωνήστε απευθείας με τον Πέτρο."}
        </p>
      )}
      <Heart className="mx-auto mt-8 h-6 w-6 text-coral" aria-hidden />
      <p className="display-italic text-3xl text-olive mt-3">P &amp; N</p>
    </div>
  );
}

function SubmittedRsvpPanel({ rsvp }: { rsvp: SubmittedRsvpResponse }) {
  const { language } = useLanguage();
  const attendanceStatus = getResponseAttendanceStatus(rsvp);
  const attendance =
    attendanceStatus === "attending"
      ? language === "en"
        ? "Attending"
        : "Θα έρθει"
      : attendanceStatus === "maybe"
        ? language === "en"
          ? "Very likely"
          : "Μάλλον ναι"
        : language === "en"
          ? "Not attending"
          : "Δεν θα έρθει";

  return (
    <div className="py-2">
      <div className="text-center">
        <Check className="mx-auto h-8 w-8 text-olive" aria-hidden />
        <p className="display-serif text-3xl text-olive mt-5">
          {language === "en"
            ? "Your RSVP has already been sent"
            : "Έχουμε ήδη λάβει την απάντησή σας"}
        </p>
        <p className="mt-3 text-foreground/75">
          {language === "en"
            ? "Here is the response we have recorded for this invitation code."
            : "Αυτή είναι η απάντηση που έχουμε καταγράψει για αυτόν τον κωδικό πρόσκλησης."}
        </p>
      </div>

      <div className="mt-8 space-y-6">
        <div className="grid sm:grid-cols-2 gap-4 border-y border-olive/15 py-5">
          <SummaryItem label={language === "en" ? "Name" : "Όνομα"} value={rsvp.fullName} />
          <SummaryItem label={language === "en" ? "Attendance" : "Παρουσία"} value={attendance} />
          <SummaryItem
            label={language === "en" ? "Total guests" : "Σύνολο καλεσμένων"}
            value={String(rsvp.guestCount)}
          />
          <SummaryItem
            label={language === "en" ? "Submitted" : "Υποβλήθηκε"}
            value={formatSubmittedAt(rsvp.submittedAt, language)}
          />
          <SummaryItem
            label="Email"
            value={rsvp.email ?? (language === "en" ? "Not provided" : "Δεν δόθηκε")}
          />
          <SummaryItem
            label={language === "en" ? "Phone" : "Τηλέφωνο"}
            value={rsvp.phoneNumber ?? (language === "en" ? "Not provided" : "Δεν δόθηκε")}
          />
        </div>

        <section>
          <h3 className="eyebrow mb-3">{language === "en" ? "RSVP list" : "Καλεσμένοι"}</h3>
          <ul className="space-y-2">
            {rsvp.guests.map((guest, index) => (
              <li
                key={`${guest.fullName}-${index}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border border-olive/15 px-4 py-3"
              >
                <span className="font-medium text-olive">
                  {guest.fullName}
                  {guest.isSubmitter
                    ? language === "en"
                      ? " (submitter)"
                      : " (άτομο επικοινωνίας)"
                    : ""}
                </span>
                {guest.under13 && (
                  <span className="text-sm text-foreground/65">
                    {language === "en" ? "Under 13, age" : "Κάτω των 13, ηλικία"} {guest.age}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="mt-7 text-center text-sm text-foreground/65">
        {language === "en"
          ? "If you need to change anything, please contact Petros directly."
          : "Αν χρειαστεί να αλλάξετε κάτι, επικοινωνήστε απευθείας με τον Πέτρο."}
      </p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow text-[0.65rem]">{label}</p>
      <p className="mt-1 text-foreground/80">{value}</p>
    </div>
  );
}

function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  const { language } = useLanguage();
  const search = useSearch({ strict: false });
  const inviteCode = typeof search.code === "string" ? search.code.trim().toLowerCase() : undefined;
  const searchLanguage = search.lang === "el" || search.lang === "en" ? search.lang : undefined;
  const homeSearch = { code: inviteCode, lang: searchLanguage };

  return (
    <div className="text-center py-8">
      <AlertCircle className="mx-auto h-8 w-8 text-coral" aria-hidden />
      <p className="display-serif text-3xl text-olive mt-5">
        {language === "en" ? "Something went wrong" : "Κάτι πήγε στραβά"}
      </p>
      <p className="mt-3 text-foreground/75">
        {language === "en"
          ? "We could not reach the RSVP service. Please try again in a moment."
          : "Δεν μπορέσαμε να συνδεθούμε με την υπηρεσία RSVP. Δοκιμάστε ξανά σε λίγο."}
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center bg-olive text-cream px-8 py-3 text-sm tracking-[0.2em] uppercase rounded-sm hover:bg-olive/90 transition"
        >
          {language === "en" ? "Try again" : "Δοκιμάστε ξανά"}
        </button>
        <Link
          to="/"
          search={homeSearch}
          className="inline-flex items-center justify-center border border-olive/40 px-8 py-3 text-sm tracking-[0.2em] uppercase text-olive hover:bg-olive/5 transition"
        >
          {language === "en" ? "Home" : "Αρχική"}
        </Link>
      </div>
    </div>
  );
}

function GuestAgeFields({
  idPrefix,
  under13,
  age,
  ageError,
  onUnder13Change,
  onAgeChange,
}: {
  idPrefix: string;
  under13: boolean;
  age: string;
  ageError?: string;
  onUnder13Change: (checked: boolean) => void;
  onAgeChange: (value: string) => void;
}) {
  const { language } = useLanguage();
  const ageId = `${idPrefix}-age`;
  const ageErrorId = `${ageId}-error`;

  return (
    <div className="mt-3 space-y-3">
      <label className="inline-flex items-center gap-2 text-sm text-foreground/80">
        <input
          type="checkbox"
          checked={under13}
          onChange={(event) => onUnder13Change(event.target.checked)}
        />
        {language === "en" ? "Under 13 years old" : "Κάτω των 13 ετών"}
      </label>
      {under13 && (
        <label className="block max-w-40">
          <span className="eyebrow block mb-2">{language === "en" ? "Age" : "Ηλικία"}</span>
          <input
            id={ageId}
            type="number"
            min={0}
            max={12}
            inputMode="numeric"
            value={age}
            onChange={(event) => onAgeChange(event.target.value)}
            aria-invalid={Boolean(ageError)}
            aria-describedby={ageError ? ageErrorId : undefined}
            className="w-full bg-transparent border-b border-olive/30 focus:border-olive outline-none py-3 text-foreground placeholder:text-muted-foreground"
          />
          {ageError && (
            <span id={ageErrorId} className="mt-2 block text-sm text-destructive" role="alert">
              {ageError}
            </span>
          )}
        </label>
      )}
    </div>
  );
}

function Input({
  name,
  label,
  error,
  className = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
}) {
  const errorId = `${name}-error`;

  return (
    <label className="block">
      <span className="eyebrow block mb-2">{label}</span>
      <input
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...rest}
        className={`w-full bg-transparent border-b border-olive/30 focus:border-olive outline-none py-3 text-foreground placeholder:text-muted-foreground ${className}`}
      />
      {error && (
        <span id={errorId} className="mt-2 block text-sm text-destructive" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

function RadioCard({
  name,
  value,
  label,
  checked,
  onChange,
  required,
}: {
  name: string;
  value: AttendanceChoice;
  label: string;
  checked: boolean;
  onChange: () => void;
  required?: boolean;
}) {
  return (
    <label className="h-full cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        required={required}
        className="peer sr-only"
      />
      <span className="flex min-h-16 h-full items-center justify-center text-center border border-olive/25 px-3 py-3 text-sm leading-snug tracking-wide text-olive peer-checked:bg-olive peer-checked:text-cream peer-checked:border-olive transition">
        {label}
      </span>
    </label>
  );
}
