import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Petros & Nikki — 25 July 2026, Athens" },
      {
        name: "description",
        content:
          "You are cordially invited to the wedding of Petros & Nikki in Athens, Greece on 25 July 2026.",
      },
      { name: "author", content: "Petros & Nikki" },
      { property: "og:title", content: "Petros & Nikki — 25 July 2026" },
      {
        property: "og:description",
        content: "Wedding ceremony at 19:30 in Glyfada, followed by reception at Efllena.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { Toaster } from "../components/ui/sonner";

function RootComponent() {
  return (
    <>
      <AuthRedirectHandler />
      <SiteHeader />
      <main>
        <Outlet />
      </main>
      <SiteFooter />
      <Toaster />
    </>
  );
}

function AuthRedirectHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let active = true;

    async function handleAuthRedirect() {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const errorDescription = hashParams.get("error_description");

      if (errorDescription) {
        toast.error(errorDescription);
        window.history.replaceState(null, document.title, window.location.pathname);
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (!accessToken || !refreshToken) return;

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (!active) return;

      if (error) {
        console.error(error);
        toast.error("Could not finish signing in. Please request a new magic link.");
        window.history.replaceState(null, document.title, window.location.pathname);
        return;
      }

      window.history.replaceState(null, document.title, window.location.pathname);
      await navigate({ to: "/admin" });
    }

    void handleAuthRedirect();

    return () => {
      active = false;
    };
  }, [navigate]);

  return null;
}
