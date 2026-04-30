import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "../components/PageShell";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/rsvp")({
  head: () => ({
    meta: [
      { title: "RSVP — Petros & Nikki" },
      { name: "description", content: "Let us know if you’ll be joining us on 25 July 2026." },
    ],
  }),
  component: RsvpPage,
});

const schema = z.object({
  guest_name: z.string().trim().min(1, "Your name is required").max(120),
  email: z.string().trim().email("Please enter a valid email").max(255),
  attending: z.enum(["yes", "no"]),
  number_of_guests: z.coerce.number().int().min(1).max(10),
  dietary_requirements: z.string().trim().max(500).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

function RsvpPage() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"yes" | "no" | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      guest_name: fd.get("guest_name"),
      email: fd.get("email"),
      attending: fd.get("attending"),
      number_of_guests: fd.get("number_of_guests") || 1,
      dietary_requirements: fd.get("dietary_requirements") || "",
      message: fd.get("message") || "",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("rsvps").insert({
      guest_name: parsed.data.guest_name,
      email: parsed.data.email,
      attending: parsed.data.attending === "yes",
      number_of_guests: parsed.data.number_of_guests,
      dietary_requirements: parsed.data.dietary_requirements || null,
      message: parsed.data.message || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not submit. Please try again.");
      return;
    }
    setDone(parsed.data.attending);
  }

  if (done) {
    return (
      <PageShell
        eyebrow="Thank You"
        title={done === "yes" ? "We can't wait" : "We'll miss you"}
        subtitle={
          done === "yes"
            ? "Your RSVP has been received. See you on 25 July in Athens."
            : "Thank you for letting us know. We’ll be thinking of you."
        }
      >
        <div className="text-center mt-8">
          <p className="display-italic text-3xl text-olive">— P &amp; N</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Kindly Respond"
      title="RSVP"
      subtitle="Please let us know by 1st June 2026."
    >
      <form
        onSubmit={onSubmit}
        className="bg-cream/70 backdrop-blur-sm border border-olive/20 p-8 md:p-12 max-w-2xl mx-auto mt-6 space-y-6"
      >
        <div className="grid sm:grid-cols-2 gap-6">
          <Input name="guest_name" label="Full name" required />
          <Input name="email" type="email" label="Email" required />
        </div>

        <fieldset>
          <legend className="eyebrow mb-3">Will you be attending?</legend>
          <div className="flex gap-3">
            <RadioCard name="attending" value="yes" label="Joyfully accept" />
            <RadioCard name="attending" value="no" label="Regretfully decline" />
          </div>
        </fieldset>

        <Input
          name="number_of_guests"
          type="number"
          label="Number of guests (incl. yourself)"
          defaultValue={1}
          min={1}
          max={10}
        />

        <Textarea
          name="dietary_requirements"
          label="Dietary requirements"
          placeholder="Vegetarian, allergies, etc."
        />
        <Textarea
          name="message"
          label="A note for the couple (optional)"
          placeholder="Leave us a few kind words…"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-olive text-cream py-3.5 text-sm tracking-[0.2em] uppercase rounded-sm hover:bg-olive/90 transition disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send RSVP"}
        </button>
      </form>
    </PageShell>
  );
}

function Input({
  name,
  label,
  type = "text",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className="block">
      <span className="eyebrow block mb-2">{label}</span>
      <input
        name={name}
        type={type}
        {...rest}
        className="w-full bg-transparent border-b border-olive/30 focus:border-olive outline-none py-2 text-foreground"
      />
    </label>
  );
}

function Textarea({
  name,
  label,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string }) {
  return (
    <label className="block">
      <span className="eyebrow block mb-2">{label}</span>
      <textarea
        name={name}
        rows={3}
        {...rest}
        className="w-full bg-transparent border border-olive/25 focus:border-olive outline-none p-3 text-foreground rounded-sm placeholder:text-muted-foreground"
      />
    </label>
  );
}

function RadioCard({ name, value, label }: { name: string; value: string; label: string }) {
  return (
    <label className="flex-1 cursor-pointer">
      <input type="radio" name={name} value={value} required className="peer sr-only" />
      <div className="text-center border border-olive/25 py-4 px-3 text-sm tracking-wide text-olive peer-checked:bg-olive peer-checked:text-cream peer-checked:border-olive transition">
        {label}
      </div>
    </label>
  );
}
