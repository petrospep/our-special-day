import coral from "@/assets/blob-coral.png";
import yellow from "@/assets/blob-yellow.png";
import green from "@/assets/blob-green.png";

type Blob = "coral" | "yellow" | "green";

const map: Record<Blob, string> = { coral, yellow, green };

interface Props {
  blob: Blob;
  className?: string;
  style?: React.CSSProperties;
}

export function Watercolor({ blob, className, style }: Props) {
  return (
    <img
      src={map[blob]}
      alt=""
      aria-hidden
      loading="lazy"
      className={`pointer-events-none absolute select-none ${className ?? ""}`}
      style={style}
    />
  );
}
