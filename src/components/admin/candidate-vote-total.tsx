export function CandidateVoteTotal({
  status,
  total,
}: {
  status: string;
  total: number;
}) {
  if (status !== "scheduled" && status !== "closed") {
    return <p>Perolehan suara tersedia setelah pemilihan dijadwalkan.</p>;
  }
  return (
    <p className="admin-voting-votes"><strong>{total}</strong> suara</p>
  );
}
