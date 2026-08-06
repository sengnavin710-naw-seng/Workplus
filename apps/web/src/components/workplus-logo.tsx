import Image from "next/image";

interface WorkplusLogoProps {
  className?: string;
  compact?: boolean;
  markSize?: "default" | "medium";
  showWordmark?: boolean;
}

export function WorkplusLogo({
  className = "",
  compact = false,
  markSize = "default",
  showWordmark = true,
}: WorkplusLogoProps) {
  return (
    <span
      className={`inline-flex items-center text-[var(--ink)] ${showWordmark ? (compact ? "gap-2.5" : "flex-col gap-3") : ""} ${className}`}
    >
      <Image
        alt=""
        aria-hidden="true"
        className={compact ? "size-8" : markSize === "medium" ? "size-20" : "size-28"}
        height={112}
        priority
        src="/workplus-icon.svg"
        width={112}
      />
      {showWordmark ? (
        <span
          className={compact ? "text-lg font-medium" : "text-[2rem] font-medium leading-none tracking-[-0.025em]"}
        >
          workplus
        </span>
      ) : null}
    </span>
  );
}
