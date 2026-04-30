import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "../components/PageShell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Petros & Nikki" },
      { name: "description", content: "Answers to common questions about the wedding day." },
    ],
  }),
  component: FaqPage,
});

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

function FaqPage() {
  return (
    <PageShell
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
