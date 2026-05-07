import { createFileRoute } from "@tanstack/react-router";
import { RsvpContent } from "@/components/RsvpContent";

export const Route = createFileRoute("/rsvp")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  component: RsvpRoute,
});

function RsvpRoute() {
  const search = Route.useSearch();

  return <RsvpContent initialCodeFromUrl={search.code ?? ""} />;
}
