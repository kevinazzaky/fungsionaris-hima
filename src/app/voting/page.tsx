import type { Metadata } from "next";
import { loadVoting } from "@/data/voting";
import { VotingPage } from "@/components/voting/voting-page";
import "./voting.css";

export const metadata: Metadata = {
  title: "Pemilihan Ketua",
  alternates: { canonical: "/voting" },
  robots: { index: false, follow: false },
};
export default async function Page() {
  return <VotingPage data={await loadVoting()} />;
}
