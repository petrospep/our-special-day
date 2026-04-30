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
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            obs.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={`reveal ${shown ? "reveal-in" : ""} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
