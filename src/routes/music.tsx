import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "../components/PageShell";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Music } from "lucide-react";

export const Route = createFileRoute("/music")({
  head: () => ({
    meta: [
      { title: "Music Requests — Petros & Nikki" },
      { name: "description", content: "Request a song to keep us on the dance floor." },
    ],
  }),
  component: MusicPage,
});

const schema = z.object({
  guest_name: z.string().trim().min(1, "Your name is required").max(100),
  song_title: z.string().trim().min(1, "Song title is required").max(150),
  artist: z.string().trim().min(1, "Artist is required").max(150),
});

function MusicPage() {
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      guest_name: fd.get("guest_name"),
      song_title: fd.get("song_title"),
      artist: fd.get("artist"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
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
    e.currentTarget.reset();
  }

  return (
    <PageShell
      eyebrow="Music"
      title="Keep us dancing"
      subtitle="What song will get you on the dance floor? Tell us — we’ll make sure the DJ knows."
    >
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
    </PageShell>
  );
}

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
