import { PendingLabel } from "@/components/ui/pending-label";
import type { SubmissionStatus } from "@/lib/voting-submission";

export function VotingSubmissionFeedback({
  submission, busy, canVote, error, onBack, onVerify,
}: {
  submission: SubmissionStatus | "idle" | "verifying";
  busy: boolean;
  canVote: boolean;
  error: string;
  onBack: () => void;
  onVerify: () => void;
}) {
  return <>
    {!busy && submission === "unknown" && (
      <p className="voting-error" role="status">
        Koneksi ke server terganggu. Status suara belum dapat dipastikan.
        Kami akan memeriksa otomatis saat koneksi kembali. Tetap di halaman ini.
      </p>
    )}
    {!busy && submission === "not_recorded" && (
      <p className="voting-error" role="alert">
        {error || "Suara belum terkonfirmasi. Periksa koneksi, lalu coba lagi dengan pilihan yang sama."}
      </p>
    )}
    {!busy && submission === "expired" && (
      <p className="voting-error" role="alert">Sesi kamu sudah berakhir. Masukkan NIM kembali untuk melanjutkan.</p>
    )}
    <div className="voting-card-actions">
      {submission === "idle" && !busy && (
        <button className="voting-secondary" type="button" onClick={onBack}>Kembali memilih</button>
      )}
      {submission === "expired" ? (
        <a className="voting-primary" href="/voting">Masukkan NIM kembali</a>
      ) : (
        <button
          className="voting-primary"
          type={submission === "unknown" ? "button" : "submit"}
          onClick={submission === "unknown" ? onVerify : undefined}
          disabled={busy || submission === "verifying" || (!canVote && submission !== "unknown")}
        >
          <PendingLabel pending={busy} text="Mengirim suara…">
            {submission === "not_recorded" || submission === "unknown" ? "Coba lagi" : "Kirim suara saya"}
          </PendingLabel>
        </button>
      )}
    </div>
  </>;
}
