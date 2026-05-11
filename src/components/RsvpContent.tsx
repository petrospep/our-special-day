import { Link, useSearch } from "@tanstack/react-router";
import { AlertCircle, Check, Heart, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { callFunction } from "@/lib/functions";
import type {
  InviteCodeStatus,
  SubmitRsvpResponse,
  ValidateInviteResponse,
} from "@/lib/rsvp-types";
import { inviteCodeSchema, rsvpFormSchema } from "@/lib/rsvp-validation";

type RsvpStatus = "idle" | "validating" | "invalid" | "ready" | "submitting" | "success" | "error";
type InvalidReason = Exclude<InviteCodeStatus, "valid"> | "invalid_format";
type FieldErrors = Partial<Record<string, string>>;
type GuestFormValue = { firstName: string; lastName: string; under13: boolean; age: string };

const invalidCopy: Record<InvalidReason, { title: string; message: string; action: string }> = {
  missing_code: {
    title: "We need your invitation code",
    message: "Enter the code from your invitation and we will find your RSVP form.",
    action: "Check code",
  },
  invalid_format: {
    title: "That code does not look right",
    message: "Invitation codes start with w- followed by the letters and numbers on your invite.",
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
};

function normalizeCode(value: string) {
  return value.trim().toLowerCase();
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

export function RsvpContent({ initialCodeFromUrl = "" }: { initialCodeFromUrl?: string }) {
  const initialCode = useMemo(() => normalizeCode(initialCodeFromUrl ?? ""), [initialCodeFromUrl]);
  const [status, setStatus] = useState<RsvpStatus>(initialCode ? "validating" : "idle");
  const [code, setCode] = useState(initialCode);
  const [manualCode, setManualCode] = useState(initialCode);
  const [invalidReason, setInvalidReason] = useState<InvalidReason>("missing_code");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [attending, setAttending] = useState<"yes" | "no" | null>(null);
  const [additionalGuests, setAdditionalGuests] = useState<GuestFormValue[]>([]);
  const activeValidation = useRef(0);
  const submitInFlight = useRef(false);

  async function validateCode(rawCode: string) {
    const parsed = inviteCodeSchema.safeParse(rawCode);
    const normalizedCode = parsed.success ? parsed.data : normalizeCode(rawCode);

    setManualCode(normalizedCode);
    setCode(normalizedCode);
    setCodeError(null);

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
      });

      if (validationId !== activeValidation.current) {
        return;
      }

      if (response.ok && response.valid) {
        setStatus("ready");
        return;
      }

      if (response.ok && !response.valid) {
        setInvalidReason(response.reason);
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
      toast.error("We could not check your invitation code. Please try again.");
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
      return;
    }

    void validateCode(initialCode);
  }, [initialCode]);

  function onManualCodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = inviteCodeSchema.safeParse(manualCode);

    if (!parsed.success) {
      setCodeError(parsed.error.issues[0]?.message ?? "Enter a valid invitation code.");
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
    const attendingValue = formData.get("attending");
    const parsed = rsvpFormSchema.safeParse({
      code,
      submitter: {
        firstName: formData.get("submitterFirstName"),
        lastName: formData.get("submitterLastName"),
      },
      attending: attendingValue === "yes" ? true : attendingValue === "no" ? false : undefined,
      email: formData.get("email"),
      phoneNumber: formData.get("phoneNumber"),
      guests: additionalGuests.map((guest) => ({
        ...guest,
        age: guest.under13 ? guest.age : undefined,
      })),
    });

    if (!parsed.success) {
      const errors = getFieldErrors(parsed.error);
      setFormErrors(errors);
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form.");
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
        attending: parsed.data.attending,
        email: parsed.data.email ?? null,
        phoneNumber: parsed.data.phoneNumber ?? null,
        guests: parsed.data.guests.map((guest) => ({
          ...guest,
          age: guest.age ?? null,
        })),
      });

      setStatus("success");
      toast.success("Your RSVP has been sent.");
      form.reset();
      setAdditionalGuests([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      if (message === "already_used") {
        submitInFlight.current = false;
        setInvalidReason("used");
        setStatus("invalid");
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
      toast.error("We could not send your RSVP. Please try again.");
    }
  }

  return (
    <div className="relative overflow-hidden">
      <PageShell
        id="rsvp"
        theme="rsvp"
        eyebrow="Kindly Respond"
        title="RSVP"
        subtitle="Enter your invitation code to respond by 15th June 2026."
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
              title="Find your invitation"
              message="Your personal code is printed on your invitation."
              action="Check code"
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
  message: string;
  action: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="text-center">
        <p className="display-serif text-3xl text-olive">{title}</p>
        <p className="mt-3 text-foreground/75">{message}</p>
      </div>

      <label className="block">
        <span className="eyebrow block mb-2">Invitation code</span>
        <input
          name="code"
          value={manualCode}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(codeError)}
          aria-describedby={codeError ? "code-error" : undefined}
          autoComplete="off"
          className="w-full bg-transparent border-b border-olive/30 focus:border-olive outline-none py-3 text-foreground placeholder:text-muted-foreground"
          placeholder="w-xxxxxxxx"
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
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-12 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-olive" aria-hidden />
      <div>
        <p className="display-serif text-3xl text-olive">Checking your invitation</p>
        <p className="mt-3 text-foreground/75">This should only take a moment.</p>
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
  const copy = invalidCopy[reason];

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
        title="Try your code again"
        message="Codes can be easy to mistype, especially the letters and numbers after w-."
        action={copy.action}
      />
    </div>
  );
}

function RsvpForm({
  attending,
  errors,
  submitting,
  onAttendingChange,
  onSubmit,
  additionalGuests,
  onAddGuest,
  onRemoveGuest,
  onGuestChange,
}: {
  attending: "yes" | "no" | null;
  errors: FieldErrors;
  submitting: boolean;
  additionalGuests: GuestFormValue[];
  onAttendingChange: (value: "yes" | "no") => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onAddGuest: () => void;
  onRemoveGuest: (index: number) => void;
  onGuestChange: (
    index: number,
    key: "firstName" | "lastName" | "under13" | "age",
    value: string | boolean,
  ) => void;
}) {
  const guestCount = 1 + additionalGuests.length;

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <fieldset>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            name="submitterFirstName"
            label="First name"
            error={errors["submitter.firstName"]}
            autoComplete="given-name"
            required
          />
          <Input
            name="submitterLastName"
            label="Last name"
            error={errors["submitter.lastName"]}
            autoComplete="family-name"
            required
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-3">Contact details</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            name="email"
            type="email"
            label="Email (optional)"
            error={errors.email}
            autoComplete="email"
          />
          <Input
            name="phoneNumber"
            type="tel"
            label="Phone number (optional)"
            error={errors.phoneNumber}
            autoComplete="tel"
          />
        </div>
      </fieldset>

      <fieldset aria-describedby={errors.attending ? "attending-error" : undefined}>
        <legend className="eyebrow mb-3">Will you be attending?</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          <RadioCard
            name="attending"
            value="yes"
            label="Joyfully accept"
            checked={attending === "yes"}
            onChange={() => onAttendingChange("yes")}
            required
          />
          <RadioCard
            name="attending"
            value="no"
            label="Regretfully decline"
            checked={attending === "no"}
            onChange={() => onAttendingChange("no")}
            required
          />
        </div>
        {errors.attending && (
          <p id="attending-error" className="mt-2 text-sm text-destructive" role="alert">
            {errors.attending}
          </p>
        )}
      </fieldset>

      <fieldset aria-describedby={errors.guests ? "guest-count-error" : undefined}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <legend className="eyebrow">RSVP list</legend>
          <button
            type="button"
            onClick={onAddGuest}
            disabled={guestCount >= 10}
            className="text-xs tracking-[0.15em] uppercase border border-olive/35 px-3 py-2 text-olive hover:bg-olive/5 transition disabled:opacity-50"
          >
            Add guest
          </button>
        </div>
        <p className="text-sm text-foreground/70">Total guests: {guestCount}</p>
        <div className="mt-3 space-y-3">
          {additionalGuests.map((guest, index) => (
            <div key={index} className="space-y-3 border border-olive/20 p-3 rounded-sm">
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  value={guest.firstName}
                  onChange={(event) => onGuestChange(index, "firstName", event.target.value)}
                  aria-invalid={Boolean(errors[`guests.${index}.firstName`])}
                  className="w-full bg-transparent border-b border-olive/30 focus:border-olive outline-none py-3 text-foreground placeholder:text-muted-foreground"
                  placeholder="First name"
                  required
                />
                <input
                  value={guest.lastName}
                  onChange={(event) => onGuestChange(index, "lastName", event.target.value)}
                  aria-invalid={Boolean(errors[`guests.${index}.lastName`])}
                  className="w-full bg-transparent border-b border-olive/30 focus:border-olive outline-none py-3 text-foreground placeholder:text-muted-foreground"
                  placeholder="Last name"
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
                Remove
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
        {submitting ? "Sending..." : "Send RSVP"}
      </button>
    </form>
  );
}

function SuccessPanel({ attending }: { attending: "yes" | "no" | null }) {
  const isAttending = attending !== "no";

  return (
    <div className="text-center py-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-olive text-cream">
        <Check className="h-6 w-6" aria-hidden />
      </div>
      <p className="display-serif text-4xl text-olive mt-6">
        {isAttending ? "We can't wait" : "We'll miss you"}
      </p>
      <p className="mt-4 text-foreground/75">
        {isAttending
          ? "Your RSVP has been received. See you on 25 July in Athens."
          : "Thank you for letting us know. We will be thinking of you."}
      </p>
      <Heart className="mx-auto mt-8 h-6 w-6 text-coral" aria-hidden />
      <p className="display-italic text-3xl text-olive mt-3">P &amp; N</p>
    </div>
  );
}

function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  const search = useSearch({ strict: false });
  const inviteCode = typeof search.code === "string" ? search.code.trim().toLowerCase() : undefined;
  const homeSearch = { code: inviteCode };

  return (
    <div className="text-center py-8">
      <AlertCircle className="mx-auto h-8 w-8 text-coral" aria-hidden />
      <p className="display-serif text-3xl text-olive mt-5">Something went wrong</p>
      <p className="mt-3 text-foreground/75">
        We could not reach the RSVP service. Please try again in a moment.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center bg-olive text-cream px-8 py-3 text-sm tracking-[0.2em] uppercase rounded-sm hover:bg-olive/90 transition"
        >
          Try again
        </button>
        <Link
          to="/"
          search={homeSearch}
          className="inline-flex items-center justify-center border border-olive/40 px-8 py-3 text-sm tracking-[0.2em] uppercase text-olive hover:bg-olive/5 transition"
        >
          Home
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
        Under 13 years old
      </label>
      {under13 && (
        <label className="block max-w-40">
          <span className="eyebrow block mb-2">Age</span>
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
  value: "yes" | "no";
  label: string;
  checked: boolean;
  onChange: () => void;
  required?: boolean;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        required={required}
        className="peer sr-only"
      />
      <span className="block text-center border border-olive/25 py-4 px-3 text-sm tracking-wide text-olive peer-checked:bg-olive peer-checked:text-cream peer-checked:border-olive transition">
        {label}
      </span>
    </label>
  );
}
