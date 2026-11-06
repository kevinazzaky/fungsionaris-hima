import {
  Broadcast,
  Cake,
  Code,
  HandHeart,
  Microphone,
} from "@phosphor-icons/react/dist/ssr";
import { PROGRAM_STATUSES, type Program } from "@/domain/programs";
import type { ProgramItem } from "./program-modal";

const icons = {
  microphone: Microphone,
  code: Code,
  broadcast: Broadcast,
  heart: HandHeart,
  cake: Cake,
};
export function programPeriods(programs: Program[]) {
  const groups = new Map<string, ProgramItem[]>();
  for (const program of programs) {
    const items = groups.get(program.period) || [];
    items.push({
      ...program,
      icon: icons[program.icon],
      image: program.imageUrl,
      statusText: PROGRAM_STATUSES[program.status],
      extraDetails:
        program.speakers.length ||
        program.benefits.length ||
        program.price ||
        program.contactPerson
          ? {
              speakers: program.speakers,
              benefits: program.benefits,
              price: program.price,
              contactPerson: program.contactPerson,
            }
          : undefined,
    });
    groups.set(program.period, items);
  }
  return [...groups]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => ({ key, label: key, programs: items }));
}
