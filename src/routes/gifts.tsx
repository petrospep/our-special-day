import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "../components/PageShell";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/gifts")({
  head: () => ({
    meta: [
      { title: "Gifts — Petros & Nikki" },
      { name: "description", content: "A note about wedding gifts and our honeymoon fund." },
    ],
  }),
  component: GiftsPage,
});

function GiftsPage() {
  return (
    <PageShell
      eyebrow="With Love"
      title="A little note on gifts"
      subtitle="Your presence at our wedding is the greatest gift of all."
    >
      <div className="bg-cream/70 backdrop-blur-sm border border-olive/20 p-10 md:p-14 text-center max-w-2xl mx-auto mt-6">
        <Heart size={28} className="mx-auto text-coral" strokeWidth={1.5} />
        <p className="display-italic text-2xl md:text-3xl text-olive mt-6 leading-relaxed">
          “If you wish to honour us with a gift, a contribution toward our honeymoon
          would mean the world.”
        </p>
        <div className="mx-auto h-px w-10 bg-olive/40 my-8" />
        <p className="text-foreground/75 leading-relaxed">
          We’re saving up for a slow trip across the Greek islands after the wedding —
          long lunches, swims, and golden hours. Any contribution, big or small,
          helps make those memories.
        </p>
        <p className="eyebrow mt-10">Honeymoon Fund</p>
        <p className="display-serif text-2xl text-olive mt-2">
          Details will be shared with your invitation
        </p>
      </div>
    </PageShell>
  );
}
