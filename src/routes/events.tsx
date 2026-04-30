import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "../components/PageShell";
import { MapPin, Clock, Shirt } from "lucide-react";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events — Petros & Nikki" },
      { name: "description", content: "Wedding day schedule: ceremony and reception in Athens." },
    ],
  }),
  component: EventsPage,
});

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

function EventsPage() {
  return (
    <PageShell
      eyebrow="The Day"
      title={<>Saturday, 25<sup className="text-3xl">th</sup> July</>}
      subtitle="Two moments to share with the people we love most."
    >
      <div className="space-y-8 mt-8">
        {events.map((e) => (
          <article
            key={e.title}
            className="relative bg-cream/70 backdrop-blur-sm border border-olive/20 p-8 md:p-12"
          >
            <p className="eyebrow">{e.time}</p>
            <h2 className="display-serif text-4xl md:text-5xl text-olive mt-3">
              {e.title}
            </h2>
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
