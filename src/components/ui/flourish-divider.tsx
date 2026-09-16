import { BalineseDivider } from "./balinese-ornaments";

export function FlourishDivider({
  className = "",
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return <BalineseDivider className={className} light={light} />;
}
