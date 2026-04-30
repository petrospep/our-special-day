import { useEffect, useRef, useState } from "react";

interface Props extends React.HTMLAttributes<HTMLElement> {
  delay?: number;
  as?: "div" | "section" | "article";
}

/**
 * Apple-style scroll reveal: element starts faded + offset, then eases in
 * once it intersects the viewport. Honors prefers-reduced-motion.
 *
 * Defaults to visible (shown=true) so SSR/no-JS users always see content.
 * On client mount we briefly hide off-screen items, then animate them in
 * via IntersectionObserver.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as = "div",
  style,
  ...rest
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  // Start as "shown" so SSR markup is visible. Then on the client we may
  // briefly flip to false for elements not yet in view, and let the observer
  // animate them in.
  const [shown, setShown] = useState(true);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setShown(true);
      setArmed(true);
      return;
    }

    // Check current visibility synchronously
    const rect = el.getBoundingClientRect();
    const inView =
      rect.top < window.innerHeight * 0.95 && rect.bottom > 0;

    if (inView) {
      // Already on screen — keep shown
      setShown(true);
      setArmed(true);
      return;
    }

    // Off screen — hide, then observe to fade in
    setShown(false);
    setArmed(true);

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" }
    );
    obs.observe(el);

    // Safety net
    const safety = window.setTimeout(() => {
      setShown(true);
      obs.disconnect();
    }, 2000);

    return () => {
      window.clearTimeout(safety);
      obs.disconnect();
    };
  }, []);

  const baseClass = armed ? "reveal" : "";
  const inClass = shown ? "reveal-in" : "";

  const props = {
    ref: ref as React.RefObject<never>,
    style: { ...style, transitionDelay: shown ? `${delay}ms` : "0ms" },
    className: `${baseClass} ${inClass} ${className}`.trim(),
    ...rest,
  };

  if (as === "section") return <section {...props}>{children}</section>;
  if (as === "article") return <article {...props}>{children}</article>;
  return <div {...props}>{children}</div>;
}
