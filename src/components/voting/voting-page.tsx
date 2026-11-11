"use client";

import Link from "@/components/ui/navigation-link";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { VotingCandidateCard } from "./voting-candidate-card";
import { VotingDialog } from "./voting-dialog";
import { PendingLabel } from "@/components/ui/pending-label";
import { checkVotingSubmission, submitVotingChoice, type SubmissionStatus } from "@/lib/voting-submission";
import {
  electionState,
  votingStateLabels,
  type VotingCandidate,
  type VotingPublicData,
} from "@/domain/voting";

function schedule(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Asia/Makassar",
      }).format(new Date(value)) + " WITA"
    : "Menunggu jadwal panitia";
}

export function candidatesWithProfileFirst(candidates: VotingCandidate[], profileId?: string) {
  const active = candidates.find(c => c.id === profileId);
  return active ? [active, ...candidates.filter(c => c.id !== profileId)] : candidates;
}

async function send(path: string, payload: object) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Permintaan gagal. Silakan coba kembali.");
  return result;
}

export function VotingPage({ data }: { data: VotingPublicData }) {
  const [now, setNow] = useState(() => new Date());
  const [nim, setNim] = useState("");
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<VotingCandidate | null>(null);
  const [selection, setSelection] = useState<VotingCandidate | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submission, setSubmission] = useState<SubmissionStatus | "idle" | "verifying">("idle");
  const successHeading = useRef<HTMLHeadingElement>(null);
  const candidateHeading = useRef<HTMLHeadingElement>(null);
  const candidateGrid = useRef<HTMLDivElement>(null);
  const status = data.election ? electionState(data.election, now) : "draft";
  const canVote = data.available && status === "open";
  const candidates =
    data.election?.candidates.filter((c) => !c.placeholder) || [];
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!success) return;
    successHeading.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
    const timer = setTimeout(() => window.location.replace("/"), 3000);
    return () => clearTimeout(timer);
  }, [success]);
  useEffect(() => {
    if (!token) return;
    candidateHeading.current?.focus({ preventScroll: true });
    document.getElementById("kandidat")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }, [token]);

  const finishSubmission = useCallback(() => {
    setSuccess(true);
    setToken("");
    setSelection(null);
    setProfile(null);
    setNim("");
  }, []);
  const applySubmissionStatus = useCallback((result: SubmissionStatus) => {
    setSubmission(result);
    if (result === "recorded") finishSubmission();
  }, [finishSubmission]);
  const verifySubmission = useCallback(async () => {
    if (inFlight.current || !token) return;
    inFlight.current = true;
    setBusy(true);
    setSubmission("verifying");
    setError("");
    try {
      applySubmissionStatus(await checkVotingSubmission(send, token));
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }, [token, applySubmissionStatus]);
  useEffect(() => {
    if (submission !== "unknown") return;
    const checkWhenOnline = () => { void verifySubmission(); };
    window.addEventListener("online", checkWhenOnline);
    return () => window.removeEventListener("online", checkWhenOnline);
  }, [submission, verifySubmission]);
  async function checkNim(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await send("/api/voting/check", { nim });
      setToken(result.token);
      setNim("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Permintaan gagal.");
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  async function submitVote(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current || !selection || submission === "unknown" || submission === "verifying") return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await submitVotingChoice(async (path, payload) => {
        try {
          return await send(path, payload);
        } catch (error) {
          if (path.endsWith("/ballots") && error instanceof Error && error.name === "Error")
            setError(error.message);
          throw error;
        }
      }, {
        token,
        candidateId: selection.id,
      }, () => setSubmission("verifying"));
      applySubmissionStatus(result);
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  function select(c: VotingCandidate) {
    setProfile(null);
    setSelection(c);
    setError("");
  }

  function toggleProfile(c: VotingCandidate) {
    const next = profile?.id === c.id ? null : c;
    const update = () => {
      flushSync(() => setProfile(next));
      if (next)
        candidateGrid.current?.scrollIntoView({ block: "start", behavior: "instant" });
    };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (document.startViewTransition && !reducedMotion)
      document.startViewTransition(update);
    else update();
  }

  if (success)
    return (
      <div className="voting">
        <section className="voting-success" aria-live="polite">
          <p className="voting-kicker">HIMA TI UNDIKNAS</p>
          <h1 ref={successHeading} tabIndex={-1}>
            Terima kasih sudah berpartisipasi.
          </h1>
          <p>
            Surat suara berhasil disimpan. Hak pilih untuk periode ini sudah
            digunakan.
          </p>
          <p>Anda akan kembali ke beranda dalam 3 detik.</p>
          <Link className="voting-primary" href="/">
            Kembali ke beranda
          </Link>
        </section>
      </div>
    );

  return (
    <div className="voting">
      {!token && (
        <section className="voting-hero">
          <div className="voting-container">
            <Link href="/" className="voting-back">
              ← Kembali ke HIMA TI
            </Link>
            <div className="voting-hero-layout">
              <div className="voting-hero-copy">
                <p className="voting-kicker">
                  PEMILIHAN KETUA · {data.election?.period || "HIMA TI"}
                </p>
                <h1>
                  Suaramu untuk <span>HIMA TI berikutnya.</span>
                </h1>
                <p className="voting-intro">
                  Kenali gagasannya. Tentukan pilihanmu. Ambil bagian dalam
                  pemilihan Ketua HIMA TI Undiknas.
                </p>
              </div>
              <section
                id="hak-pilih"
                className="voting-access"
                aria-label="Hak pilih mahasiswa"
              >
                <div className="voting-access-panel">
                  <p className="voting-panel-status" data-open={canVote}>
                    <span aria-hidden="true" />
                    {canVote
                      ? "Pemilihan sedang berlangsung"
                      : votingStateLabels[status]}
                  </p>
                  {!canVote ? (
                    <>
                      <h2>
                        {status === "ended" || status === "closed"
                          ? "Terima kasih atas partisipasimu."
                          : "Suaramu segera mendapat giliran."}
                      </h2>
                      <p className="voting-panel-description">
                        {status === "ended" || status === "closed"
                          ? "Pemungutan suara periode ini sudah berakhir. Informasi selanjutnya akan disampaikan oleh panitia HIMA TI."
                          : status === "upcoming"
                            ? `Pemungutan suara dimulai ${schedule(data.election?.startsAt)}.`
                            : "Panitia sedang menyiapkan profil kandidat, NIM terdaftar, dan jadwal pemilihan."}
                      </p>
                      {!data.available && (
                        <p>
                          Layanan prototipe belum diaktifkan atau konfigurasi
                          belum lengkap. Pemberian suara belum tersedia.
                        </p>
                      )}
                      <Link
                        className="voting-primary voting-panel-cta"
                        href="/"
                      >
                        Kembali ke beranda
                      </Link>
                    </>
                  ) : (
                    <form onSubmit={checkNim} aria-busy={busy}>
                      <h2>Mulai dari NIM kamu.</h2>
                      <p className="voting-panel-description">
                        Masukkan NIM yang terdaftar untuk melihat kandidat dan
                        menggunakan hak pilihmu.
                      </p>
                      <label htmlFor="voting-nim">Nomor Induk Mahasiswa</label>
                      <input
                        id="voting-nim"
                        name="nim"
                        value={nim}
                        onChange={(e) =>
                          setNim(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        inputMode="numeric"
                        pattern="[0-9]{8}"
                        minLength={8}
                        maxLength={8}
                        autoComplete="off"
                        placeholder="Ketik NIM kamu"
                        required
                        disabled={busy}
                        aria-describedby="voting-nim-help"
                      />
                      <p id="voting-nim-help">
                        Masukkan 8 angka NIM milikmu sendiri.
                      </p>
                      <button
                        className="voting-primary voting-panel-cta"
                        type="submit"
                        disabled={busy}
                      >
                        <PendingLabel pending={busy} text="Memeriksa NIM…">Periksa NIM dan lihat kandidat</PendingLabel>
                      </button>
                    </form>
                  )}
                  {error && !selection && (
                    <p className="voting-error" role="alert">
                      {error}
                    </p>
                  )}
                  {data.error && (
                    <div className="voting-error" role="alert">
                      <p>{data.error}</p>
                      <button
                        type="button"
                        className="voting-secondary"
                        onClick={() => window.location.reload()}
                      >
                        Coba muat ulang
                      </button>
                    </div>
                  )}
                  <p className="voting-panel-footnote">
                    Satu NIM, satu hak pilih per periode. Pilihan yang berhasil
                    dikirim tidak dapat diubah.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </section>
      )}
      <div className="voting-container">
        {token && (
          <section id="kandidat" className="voting-candidates">
            <div className="voting-candidate-toolbar">
              <Link href="/" className="voting-back">
                ← Kembali ke HIMA TI
              </Link>
              <button
                type="button"
                className="voting-secondary"
                disabled={busy}
                onClick={() => {
                  setToken("");
                  setProfile(null);
                  setSelection(null);
                  setError("");
                }}
              >
                Ganti NIM
              </button>
            </div>
            <div className="voting-section-heading">
              <div>
                <p className="voting-kicker">
                  PEMILIHAN KETUA · {data.election?.period}
                </p>
                <h1
                  className="voting-candidate-title"
                  ref={candidateHeading}
                  tabIndex={-1}
                >
                  Tentukan pilihanmu.
                </h1>
                <p>
                  Baca visi, misi, dan program kerja sebelum memilih. Satu suara
                  untuk satu kandidat.
                </p>
              </div>
            </div>
            {!canVote && (
              <p className="voting-error" role="alert">
                Pemungutan suara sudah berakhir. Pengiriman suara dinonaktifkan.
              </p>
            )}
            {!candidates.length && (
              <p>Profil kandidat belum ditambahkan oleh panitia.</p>
            )}
            <div
              ref={candidateGrid}
              className="voting-grid"
              data-count={Math.min(candidates.length, 3)}
            >
              {candidatesWithProfileFirst(candidates, profile?.id).map((c) => (
                <VotingCandidateCard
                  key={c.id}
                  candidate={c}
                  open={profile?.id === c.id}
                  canVote={canVote}
                  onToggle={() => toggleProfile(c)}
                  onSelect={() => select(c)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
      {selection && (
        <VotingDialog
          title="Konfirmasi pilihan"
          busy={busy || submission !== "idle"}
          onClose={() => {
            setSelection(null);
            setError("");
          }}
        >
          <form onSubmit={submitVote} aria-busy={busy}>
            <p>
              Anda memilih kandidat nomor <strong>{selection.number}</strong>.
            </p>
            <h3>{selection.name}</h3>
            <p>
              Setelah berhasil dikirim, pilihan tidak dapat diubah dan hak pilih
              untuk periode ini sudah digunakan.
            </p>
            {!canVote && (
              <p role="alert">
                Pemungutan suara telah berakhir. Pengiriman dinonaktifkan.
              </p>
            )}
            {error && (
              <p className="voting-error" role="alert">
                {error}
              </p>
            )}
            {submission === "verifying" && (
              <p role="status"><PendingLabel pending text="Koneksi terganggu. Memeriksa status suara…" /></p>
            )}
            {submission === "unknown" && (
              <p className="voting-error" role="status">
                Status suara belum dapat dipastikan. Periksa status saat koneksi tersedia; jangan mengirim suara ulang dulu.
                Jika sesi sudah berakhir, masukkan NIM kembali atau hubungi panitia.
              </p>
            )}
            {submission === "not_recorded" && (
              <p role="status">Suara belum terdeteksi. Pengiriman sebelumnya mungkin masih diproses. Periksa lagi atau kirim ulang pilihan yang sama; sistem hanya mencatat satu suara.</p>
            )}
            <div className="voting-card-actions">
              <button
                className="voting-secondary"
                type="button"
                disabled={busy || submission !== "idle"}
                onClick={() => {
                  setSelection(null);
                  setError("");
                }}
              >
                Kembali memilih
              </button>
              {submission !== "idle" && <button className="voting-secondary" type="button" disabled={busy} onClick={() => void verifySubmission()}>Periksa status suara</button>}
              {submission === "unknown" && !busy && <a className="voting-secondary" href="/voting">Periksa dengan NIM kembali</a>}
              <button
                className="voting-primary"
                type="submit"
                disabled={busy || !canVote || submission === "unknown" || submission === "verifying"}
              >
                <PendingLabel pending={busy} text={submission === "verifying" ? "Memeriksa status…" : "Mengirim suara…"}>{submission === "not_recorded" ? "Kirim ulang pilihan yang sama" : "Kirim suara saya"}</PendingLabel>
              </button>
            </div>
          </form>
        </VotingDialog>
      )}
    </div>
  );
}
