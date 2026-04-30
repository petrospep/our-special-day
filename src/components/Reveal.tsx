import { useEffect, useRef, useState } from "react";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number;
  as?: "div" | "section" | "article";
}

/**
 * Apple-style scroll reveal: element starts faded + offset, then eases in
 * once it intersects the viewport. Honors prefers-reduced-motion.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as = "div",
  style,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    // If IntersectionObserver isn't available, just show.
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    // Fallback safety net: ensure content is shown after 1.5s no matter what
    // (prevents content being permanently hidden if observer misses).
    const safety = window.setTimeout(() => setShown(true), 1500);

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            window.clearTimeout(safety);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" }
    );
    obs.observe(el);

    return () => {
      window.clearTimeout(safety);
      obs.disconnect();
    };
  }, []);

  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref}
      style={{ ...style, transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={`reveal ${shown ? "reveal-in" : ""} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
