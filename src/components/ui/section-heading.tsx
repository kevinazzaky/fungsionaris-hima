export function SectionHeading({
  script,
  bold,
  light = false,
  className,
}: {
  script: string;
  bold: string;
  light?: boolean;
  className?: string;
}) {
  return (
    <h2
      className={`font-heading text-3xl font-bold tracking-tight sm:text-4xl ${
        light ? "text-white" : "text-zinc-900"
      } ${className ?? ""}`}
    >
      <span className="mr-2 font-script text-[1.15em] italic font-medium text-amber-500">
        {script}
      </span>
      {bold}
    </h2>
  );
}
