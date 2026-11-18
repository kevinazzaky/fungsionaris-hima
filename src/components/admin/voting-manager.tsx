"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Key, Lock } from "@phosphor-icons/react/dist/ssr";
import { EditorDialog } from "./editor-dialog";
import { AdminRequestError, requestJson, formatDate } from "./request";
import { VotingPinField } from "./voting-pin-field";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { CandidateVoteTotal } from "./candidate-vote-total";
import {
  votingStateLabels,
  electionState,
  type VotingCandidate,
  type CandidateProgram,
} from "@/domain/voting";
import type { VotingDashboardData } from "@/data/repositories/voting";
import { votingActivityLabel } from "@/domain/voting-activity";
import { DateTimeField } from "./date-time-field";
import { PendingLabel } from "@/components/ui/pending-label";

type Preview = {
  total: number;
  valid: number;
  issues: { row: number; message: string }[];
  sample: string[];
};
type Modal = "candidate" | "schedule" | "open" | "close" | "reset" | "pin" | null;

function witaInput(date: Date) {
  return date
    .toLocaleString("sv-SE", {
      timeZone: "Asia/Makassar",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(" ", "T");
}

export function VotingManager({
  initialPinUpdatedAt = null,
}: {
  initialPinUpdatedAt?: string | null;
}) {
  const router = useRouter();
  const [locking, startLockTransition] = useTransition();
  const [data, setData] = useState<VotingDashboardData | null>(null);
  const [pinUpdatedAt, setPinUpdatedAt] = useState<string | null>(
    initialPinUpdatedAt,
  );
  const [currentPinInput, setCurrentPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [candidate, setCandidate] = useState<VotingCandidate | null>(null);
  const [csv, setCsv] = useState(""),
    [preview, setPreview] = useState<Preview | null>(null);
  const [manualNim, setManualNim] = useState("");
  const [manualName, setManualName] = useState("");
  const [liveError, setLiveError] = useState("");
  const [startsAt, setStartsAt] = useState(""),
    [endsAt, setEndsAt] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");
  const inFlight = useRef(false),
    version = useRef(0);
  const pageHeading = useRef<HTMLHeadingElement>(null);
  const election = data?.election;
  const draft = election?.status === "draft";
  const canOpen =
    draft ||
    election?.status === "closed" ||
    (election && electionState(election) === "ended");
  const addedCandidates =
    election?.candidates.filter((c) => !c.placeholder) || [];
  const currentYear = new Date().getFullYear();
  const periods = [
    ...new Set([
      ...(data?.elections.map((e) => e.period) || []),
      ...Array.from(
        { length: 5 },
        (_, i) => `${currentYear - 2 + i}/${currentYear - 1 + i}`,
      ),
    ]),
  ].sort((a, b) => b.localeCompare(a, "id", { numeric: true }));

  const clearLockedSession = useCallback(() => {
    ++version.current;
    setData(null);
    setModal(null);
    setCandidate(null);
    setPreview(null);
    setCsv("");
    setLiveError("");
    setMessage("");
    startLockTransition(() => {
      router.refresh();
    });
  }, [router]);

  const handleLockedOrError = useCallback(
    (e: unknown, fallback: string, setTargetError: (msg: string) => void) => {
      if (e instanceof AdminRequestError && e.locked) {
        clearLockedSession();
        return true;
      }
      setTargetError(e instanceof Error ? e.message : fallback);
      return false;
    },
    [clearLockedSession],
  );

  async function lockPanel() {
    if (inFlight.current || locking) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await requestJson<{ unlocked: boolean }>("/api/admin/voting/pin", {
        method: "DELETE",
      });
      clearLockedSession();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Penguncian akses belum berhasil.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function load(id = selectedId) {
    const requestVersion = ++version.current;
    setLoading(true);
    try {
      const next = await requestJson<VotingDashboardData>(
        `/api/admin/voting${id ? `?id=${id}` : ""}`,
      );
      if (requestVersion === version.current) {
        setData(next);
        setLiveError("");
      }
    } catch (e) {
      if (requestVersion === version.current)
        handleLockedOrError(e, "Data tidak dapat dimuat.", setError);
    } finally {
      if (requestVersion === version.current) setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    requestJson<VotingDashboardData>("/api/admin/voting")
      .then((next) => {
        if (active) setData(next);
      })
      .catch((e) => {
        if (active)
          handleLockedOrError(e, "Data tidak dapat dimuat.", setError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [handleLockedOrError]);

  useEffect(() => {
    const id = election?.id;
    if (!id || election.status !== "scheduled" || loading || busy || modal)
      return;
    let active = true;
    let pending = false;
    const requestVersion = version.current;
    const controller = new AbortController();
    async function refresh() {
      if (document.hidden || pending || inFlight.current) return;
      pending = true;
      try {
        const next = await requestJson<VotingDashboardData>(
          `/api/admin/voting?id=${id}`,
          { signal: controller.signal },
        );
        if (active && requestVersion === version.current) {
          setData(next);
          setLiveError("");
        }
      } catch (e) {
        if (active && requestVersion === version.current) {
          handleLockedOrError(
            e,
            "Pembaruan hasil gagal. Tekan Muat ulang.",
            setLiveError,
          );
        }
      } finally {
        pending = false;
      }
    }
    const timer = setInterval(() => void refresh(), 5000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      controller.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [election?.id, election?.status, loading, busy, modal, handleLockedOrError]);

  function payload(action: string) {
    const form = new FormData();
    form.set("action", action);
    if (election) form.set("id", election.id);
    return form;
  }
  function showSchedule(action: "open" | "schedule") {
    const now = Date.now();
    const end = election?.endsAt ? new Date(election.endsAt).getTime() : 0;
    setStartsAt(witaInput(new Date(now + 5 * 60_000)));
    setEndsAt(
      witaInput(new Date(end > now + 5 * 60_000 ? end : now + 60 * 60_000)),
    );
    setError("");
    setModal(action);
  }
  async function mutate(form: FormData, success: string) {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await requestJson<{ id?: string; action?: string }>(
        "/api/admin/voting",
        {
          method: "POST",
          body: form,
        },
      );
      setMessage(result.action ? votingActivityLabel(result.action) : success);
      setModal(null);
      if (form.get("action") === "create" && result.id) {
        setSelectedId(result.id);
        await load(result.id);
      } else await load();
      pageHeading.current?.focus({ preventScroll: true });
      return true;
    } catch (e) {
      handleLockedOrError(e, "Penyimpanan gagal.", setError);
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function previewCsv() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const form = payload("preview");
      form.set("csv", csv);
      setPreview(
        await requestJson<Preview>("/api/admin/voting", {
          method: "POST",
          body: form,
        }),
      );
    } catch (e) {
      handleLockedOrError(e, "Preview gagal.", setError);
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  function resetPinFields(clearError = true) {
    setCurrentPinInput("");
    setNewPinInput("");
    setConfirmPinInput("");
    if (clearError) setError("");
  }

  function closePinModal() {
    resetPinFields(true);
    setModal(null);
  }

  async function saveNewPin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || locking) return;
    if (
      newPinInput.trim().length < 4 ||
      newPinInput.length < 4 ||
      newPinInput.length > 200
    ) {
      setError("PIN baru harus 4 sampai 200 karakter.");
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setError("Konfirmasi PIN baru tidak cocok.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await requestJson<{
        updated: boolean;
        pinUpdatedAt?: string | null;
      }>("/api/admin/voting/pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPin: currentPinInput,
          newPin: newPinInput,
          confirmPin: confirmPinInput,
        }),
      });
      if (result.pinUpdatedAt !== undefined) {
        setPinUpdatedAt(result.pinUpdatedAt);
      }
      resetPinFields(true);
      setModal(null);
      setMessage(
        "PIN Pemilihan Ketua diperbarui. Sesi di browser lain otomatis dikunci.",
      );
      pageHeading.current?.focus({ preventScroll: true });
    } catch (e) {
      handleLockedOrError(e, "Penggantian PIN gagal.", setError);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 ref={pageHeading} tabIndex={-1}>
            Pemilihan Ketua
          </h1>
          <p>Kelola kandidat, NIM terdaftar, dan periode pemilihan HIMA TI.</p>
        </div>
        <div className="admin-actions">
          <button
            className="admin-button"
            type="button"
            disabled={busy || locking}
            onClick={() => {
              resetPinFields(true);
              setModal("pin");
            }}
          >
            <Key size={16} aria-hidden="true" />
            Ganti PIN
          </button>
          <button
            className="admin-button"
            type="button"
            disabled={busy || locking}
            onClick={() => void lockPanel()}
          >
            <Lock size={16} aria-hidden="true" />
            <PendingLabel pending={locking} text="Mengunci…">
              Kunci Pemilihan Ketua
            </PendingLabel>
          </button>
          <button
            className="admin-button"
            type="button"
            disabled={loading || busy || locking}
            onClick={() => {
              setError("");
              void load();
            }}
          >
            <PendingLabel pending={loading} text="Memuat data…">
              Muat ulang
            </PendingLabel>
          </button>
        </div>
      </div>
      {message && (
        <p className="admin-success" role="status">
          {message}
        </p>
      )}
      {error && !modal && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <div className="route-loading" role="status">
          <PendingLabel pending text="Memuat pemilihan…" />
        </div>
      )}
      {!loading && !data && (
        <p>
          Data belum tersedia. Jika tabel belum dibuat, jalankan migration pada
          database uji yang sudah disetujui, lalu muat ulang.
        </p>
      )}
      {data && !loading && (
        <>
          <div className="admin-voting-periods">
            <label>
              Tahun pemilihan
              <select
                disabled={busy || loading}
                value={election?.period || ""}
                onChange={async (e) => {
                  const period = e.target.value;
                  setPreview(null);
                  setCsv("");
                  setManualNim("");
                  setError("");
                  setMessage("");
                  const existing = data.elections.find(
                    (item) => item.period === period,
                  );
                  if (existing) {
                    setSelectedId(existing.id);
                    await load(existing.id);
                  } else {
                    const form = new FormData();
                    form.set("action", "create");
                    form.set("period", period);
                    await mutate(
                      form,
                      `Pemilihan periode ${period} siap diisi. Tambahkan kandidat untuk memulai.`,
                    );
                  }
                }}
              >
                <option value="" disabled>
                  Pilih tahun pemilihan
                </option>
                {periods.map((period) => (
                  <option key={period} value={period}>
                    {period}
                    {data.elections.some(
                      (item) =>
                        item.period === period &&
                        item.id === data.activeElectionId,
                    )
                      ? " · Aktif"
                      : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!election ? (
            <section className="admin-voting-section">
              <h2>Pilih tahun pemilihan</h2>
              <p>
                Pilih tahun di atas untuk membuka periode dan mulai menambahkan
                kandidat. Pemungutan suara tetap belum dibuka sampai persiapan
                dan jadwal dikonfirmasi.
              </p>
            </section>
          ) : (
            <>
              <section className="admin-voting-section">
                <div className="admin-voting-section-heading">
                  <div>
                    <h2>Periode {election.period}</h2>
                    <p>{votingStateLabels[electionState(election)]}</p>
                    <p>
                      {data.activeElectionId === election.id
                        ? "Periode aktif di halaman publik"
                        : "Periode ini tidak ditampilkan di halaman publik"}
                    </p>
                  </div>
                  <div className="admin-actions">
                    {data.activeElectionId !== election.id && (
                      <button
                        className="admin-button"
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void mutate(
                            payload("activate"),
                            `Periode ${election.period} aktif di halaman publik. Jadwal pemungutan suara tetap berlaku.`,
                          )
                        }
                      >
                        Jadikan periode aktif
                      </button>
                    )}
                    {canOpen && (
                      <>
                        <button
                          className="admin-button admin-button-primary"
                          type="button"
                          disabled={busy}
                          onClick={() => showSchedule("open")}
                        >
                          {draft ? "Buka voting" : "Buka kembali"}
                        </button>
                        <button
                          className="admin-button"
                          type="button"
                          disabled={busy}
                          onClick={() => showSchedule("schedule")}
                        >
                          Atur jadwal
                        </button>
                      </>
                    )}
                    {election.status === "scheduled" && (
                      <button
                        className="admin-button"
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setError("");
                          setModal("close");
                        }}
                      >
                        Tutup voting
                      </button>
                    )}
                    {election.status === "closed" && (
                      <>
                        <button
                          className="admin-button danger"
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setError("");
                            setResetConfirmation("");
                            setModal("reset");
                          }}
                        >
                          Reset suara
                        </button>
                        <a
                          className="admin-button"
                          href={`/api/admin/voting?id=${election.id}&export=true`}
                        >
                          Unduh rekap Excel
                        </a>
                      </>
                    )}
                  </div>
                </div>
                {election.startsAt && election.endsAt ? (
                  <p>
                    Mulai: {formatDate(election.startsAt)} WITA · Selesai:{" "}
                    {formatDate(election.endsAt)} WITA
                  </p>
                ) : (
                  <p>
                    Jadwal belum diatur. Buka sekarang atau atur jadwal terlebih
                    dahulu.
                  </p>
                )}
                {!draft && (
                  <p>
                    <strong>
                      Profil kandidat dan NIM terdaftar telah dikunci.
                    </strong>{" "}
                    Voting dapat ditutup dan dibuka kembali. Suara yang sudah
                    masuk tetap tersimpan.
                  </p>
                )}
                {data.stats && (
                  <dl className="admin-voting-stats">
                    <div>
                      <dt>Total NIM terdaftar</dt>
                      <dd>{data.stats.total}</dd>
                    </div>
                    <div>
                      <dt>Surat suara masuk</dt>
                      <dd>{data.stats.ballots}</dd>
                    </div>
                    <div>
                      <dt>Partisipasi</dt>
                      <dd>{data.stats.participation}%</dd>
                    </div>
                    <div>
                      <dt>Audit jumlah</dt>
                      <dd>
                        {data.stats.consumed === data.stats.ballots
                          ? "Sesuai"
                          : "Perlu diperiksa"}
                      </dd>
                      <span>
                        {data.stats.consumed} hak terpakai /{" "}
                        {data.stats.ballots} surat suara
                      </span>
                    </div>
                  </dl>
                )}
              </section>
              <section className="admin-voting-section">
                <div className="admin-voting-section-heading">
                  <div>
                    <h2>Daftar kandidat</h2>
                    <p>{addedCandidates.length} kandidat ditambahkan</p>
                  </div>
                  {draft && (
                    <button
                      type="button"
                      className="admin-button admin-button-primary"
                      disabled={busy}
                      onClick={() => {
                        setCandidate({
                          id: "",
                          number: 0,
                          name: "",
                          photo: null,
                          vision: "",
                          missions: [],
                          programs: [],
                          placeholder: true,
                        });
                        setError("");
                        setModal("candidate");
                      }}
                    >
                      Tambah kandidat
                    </button>
                  )}
                </div>
                {!addedCandidates.length && (
                  <p>
                    Belum ada kandidat. Tekan Tambah kandidat untuk mengisi
                    nama, foto, visi, misi, dan program kerja calon.
                  </p>
                )}
                <div className="admin-voting-candidates">
                  {addedCandidates.map((c) => (
                    <article key={c.id}>
                      <div className="admin-voting-avatar">
                        <ProfileAvatar
                          photo={c.photo || undefined}
                          name={`Foto ${c.name}`}
                        />
                      </div>
                      <div>
                        <p>Nomor urut {c.number}</p>
                        <h3>{c.name}</h3>
                        <p>
                          Profil tersimpan
                          {!c.photo ? " · Foto belum diunggah" : ""}
                        </p>
                        <p className="admin-voting-candidate-vision">
                          {c.vision}
                        </p>
                        <details className="admin-voting-profile-details">
                          <summary>Lihat misi dan program kerja</summary>
                          <h4>Misi</h4>
                          <ol>
                            {c.missions.map((mission, i) => (
                              <li key={i}>{mission}</li>
                            ))}
                          </ol>
                          <h4>Program kerja</h4>
                          {c.programs.map((program, i) => (
                            <div
                              className="admin-voting-candidate-program"
                              key={i}
                            >
                              <h5>{program.title}</h5>
                              {program.description && (
                                <p>{program.description}</p>
                              )}
                              {program.target && (
                                <p>
                                  <strong>Sasaran:</strong> {program.target}
                                </p>
                              )}
                            </div>
                          ))}
                        </details>
                        <button
                          type="button"
                          className="admin-button"
                          disabled={!draft || busy}
                          onClick={() => {
                            setCandidate(c);
                            setError("");
                            setModal("candidate");
                          }}
                        >
                          Edit kandidat
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
              <section className="admin-voting-section">
                <h2>Hasil per kandidat</h2>
                {data.results === null ? (
                  <p>Hasil tersedia setelah pemilihan dijadwalkan.</p>
                ) : (
                  <div className="admin-table-wrap admin-voting-results">
                    {election.status === "scheduled" && (
                      <p>Diperbarui otomatis setiap 5 detik.</p>
                    )}
                    {liveError && (
                      <p className="admin-error" role="alert">
                        {liveError}
                      </p>
                    )}
                    <table>
                      <caption>
                        {election.status === "closed"
                          ? "Hasil saat ditutup"
                          : "Hasil sementara"}{" "}
                        periode {election.period}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Nomor</th>
                          <th scope="col">Kandidat</th>
                          <th scope="col">Suara</th>
                        </tr>
                      </thead>
                      <tbody>
                        {addedCandidates.map((c) => (
                          <tr key={c.id}>
                            <td>{c.number}</td>
                            <td>{c.name}</td>
                            <td>
                              <CandidateVoteTotal
                                status={election.status}
                                total={
                                  data.results?.find(
                                    (r) => r.candidateId === c.id,
                                  )?._count._all ?? 0
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
              <section className="admin-voting-section">
                <h2>Daftar pemilih</h2>
                <p>Nama dan NIM harus cocok. Satu hak pilih per periode.</p>
                <details className="admin-voting-profile-details">
                  <summary>Nama terdaftar ({data.voters.length})</summary>
                  {data.voters.length ? (
                    <ul>
                      {data.voters.map((voter) => (
                        <li key={voter.voterKey}>
                          {voter.name} ·{" "}
                          {voter.consumed ? "Sudah memilih" : "Belum memilih"}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      Belum ada nama. Lengkapi melalui impor CSV saat draft.
                    </p>
                  )}
                </details>
                {!draft && (
                  <p>
                    Penambahan NIM dikunci karena periode sudah dijadwalkan.
                  </p>
                )}
                <form
                  className="admin-form admin-voting-manual"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (!draft || busy || inFlight.current) return;
                    const form = payload("import");
                    form.set(
                      "csv",
                      `nim,nama,prodi,aktif,periode\n${manualNim},"${manualName.replaceAll('"', '""')}",TI,true,${election.period}`,
                    );
                    if (await mutate(form, "Data pemilih berhasil diproses.")) {
                      setManualNim("");
                      setManualName("");
                    }
                  }}
                >
                  <h3>Tambah atau perbarui pemilih</h3>
                  <label htmlFor="admin-voting-manual-name">
                    Nama lengkap
                    <input
                      id="admin-voting-manual-name"
                      name="name"
                      value={manualName}
                      onChange={(event) => setManualName(event.target.value)}
                      minLength={2}
                      maxLength={100}
                      pattern={"[\\p{L}][\\p{L}\\p{M} .]*"}
                      required
                      disabled={!draft || busy}
                      placeholder="Nama sesuai daftar mahasiswa"
                    />
                  </label>
                  <label htmlFor="admin-voting-manual-nim">
                    NIM
                    <input
                      id="admin-voting-manual-nim"
                      name="nim"
                      value={manualNim}
                      onChange={(event) =>
                        setManualNim(event.target.value.replace(/[^0-9]/g, ""))
                      }
                      inputMode="numeric"
                      pattern="[0-9]{8}"
                      minLength={8}
                      maxLength={8}
                      autoComplete="off"
                      placeholder="Masukkan 8 angka NIM"
                      aria-describedby="admin-voting-manual-help"
                      required
                      disabled={!draft || busy}
                    />
                  </label>
                  <small id="admin-voting-manual-help">
                    Untuk mahasiswa aktif TI angkatan 2023, 2024, 2025, dan
                    2026.
                  </small>
                  <button
                    className="admin-button admin-button-primary"
                    type="submit"
                    disabled={
                      !draft ||
                      busy ||
                      manualNim.length !== 8 ||
                      !manualName.trim()
                    }
                  >
                    <PendingLabel pending={busy} text="Menyimpan pemilih…">
                      Simpan pemilih
                    </PendingLabel>
                  </button>
                </form>
                <h3>Impor CSV</h3>
                <details className="admin-voting-profile-details">
                  <summary>Format dan contoh CSV</summary>
                  <p>
                    Gunakan kolom <code>nim,nama,prodi,aktif,periode</code>. Isi
                    prodi dengan TI, aktif dengan true, dan periode dengan{" "}
                    {election.period}. Maksimal 500 KB atau 5.000 baris per
                    file.
                  </p>
                  <p>
                    Contoh data dummy:{" "}
                    <code>
                      00000001,Nama Mahasiswa,TI,true,{election.period}
                    </code>
                    . Simpan sebagai CSV UTF-8. Impor ulang memperbarui nama
                    tanpa menggandakan NIM.
                  </p>
                </details>
                <label className="admin-voting-file">
                  Pilih berkas CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    disabled={!draft || busy}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      setPreview(null);
                      setCsv("");
                      if (!file) return;
                      if (file.size > 512000) {
                        setError("CSV maksimal 500 KB.");
                        return;
                      }
                      try {
                        setCsv(await file.text());
                      } catch {
                        setError("Berkas tidak dapat dibaca.");
                      }
                    }}
                  />
                </label>
                <button
                  className="admin-button"
                  type="button"
                  disabled={!draft || !csv || busy}
                  onClick={previewCsv}
                >
                  <PendingLabel pending={busy} text="Memeriksa berkas…">
                    Validasi dan preview
                  </PendingLabel>
                </button>
                {preview && (
                  <div className="admin-voting-preview">
                    <h3>Preview impor</h3>
                    <p>
                      {preview.total} baris · {preview.valid} valid ·{" "}
                      {preview.issues.length} bermasalah
                    </p>
                    {preview.sample.length > 0 && (
                      <p>Contoh NIM tersamarkan: {preview.sample.join(", ")}</p>
                    )}
                    {preview.issues.length > 0 && (
                      <ul>
                        {preview.issues.slice(0, 30).map((issue) => (
                          <li key={issue.row}>
                            Baris {issue.row}: {issue.message}
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      className="admin-button admin-button-primary"
                      type="button"
                      disabled={
                        !draft ||
                        busy ||
                        preview.issues.length > 0 ||
                        !preview.valid
                      }
                      onClick={async () => {
                        const form = payload("import");
                        form.set("csv", csv);
                        if (
                          await mutate(
                            form,
                            "NIM terdaftar berhasil diimpor; NIM yang sudah ada tidak digandakan.",
                          )
                        ) {
                          setCsv("");
                          setPreview(null);
                        }
                      }}
                    >
                      <PendingLabel pending={busy} text="Mengimpor NIM…">
                        Konfirmasi impor {preview.valid} pemilih
                      </PendingLabel>
                    </button>
                  </div>
                )}
              </section>
              <section className="admin-voting-section">
                <h2>Pemantauan dan aktivitas</h2>
                <p>
                  Ringkasan layanan dan riwayat pengelolaan pemilihan. Tidak
                  memuat NIM atau pilihan masing-masing pemilih.
                </p>
                {!data.health.length &&
                !data.limits.some((l) => l._sum.denied) ? (
                  <p className="admin-voting-monitor-empty">
                    Belum ada gangguan atau pembatasan permintaan yang tercatat.
                  </p>
                ) : (
                  <ul className="admin-voting-monitor">
                    {data.health.map((h) => (
                      <li key={h.code}>
                        <span>
                          {h.code === "request_rejected"
                            ? "Permintaan ditolak"
                            : h.code === "service_error"
                              ? "Gangguan layanan"
                              : "Kejadian layanan lainnya"}
                        </span>
                        <strong>
                          {h.count}
                          <small> kejadian</small>
                        </strong>
                        <time dateTime={h.lastSeen}>
                          Terakhir {formatDate(h.lastSeen)}
                        </time>
                      </li>
                    ))}
                    {data.limits
                      .filter((l) => (l._sum.denied || 0) > 0)
                      .map((l) => (
                        <li key={l.scope}>
                          <span>
                            {l.scope === "check"
                              ? "Batas pemeriksaan NIM"
                              : l.scope === "nim"
                                ? "Batas percobaan per NIM"
                                : l.scope === "submit" || l.scope === "cast"
                                  ? "Batas pengiriman suara"
                                  : "Batas permintaan layanan"}
                          </span>
                          <strong>
                            {l._sum.denied || 0}
                            <small> permintaan</small>
                          </strong>
                          <span className="admin-voting-monitor-note">
                            Dalam jendela pembatasan yang masih aktif
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
                <div className="admin-voting-activity-heading">
                  <h3>Riwayat aktivitas panitia</h3>
                  <p>Aktivitas terbaru ditampilkan lebih dahulu · Waktu WITA</p>
                </div>
                {data.logs.length ? (
                  <ul className="admin-voting-logs">
                    {data.logs.map((log) => (
                      <li key={log.id}>
                        <time dateTime={log.createdAt}>
                          {formatDate(log.createdAt)}
                        </time>
                        <span>{votingActivityLabel(log.action)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Belum ada aktivitas administratif.</p>
                )}
              </section>
            </>
          )}
        </>
      )}
      {modal === "candidate" && candidate && (
        <EditorDialog
          title={
            candidate.placeholder
              ? "Tambah kandidat"
              : `Edit kandidat nomor ${candidate.number}`
          }
          busy={busy}
          onClose={() => setModal(null)}
        >
          <CandidateEditor
            candidate={candidate}
            busy={busy}
            error={error}
            onSave={async (input, file) => {
              const form = payload("candidate");
              if (!candidate.placeholder)
                form.set("number", String(candidate.number));
              form.set("data", JSON.stringify(input));
              if (file) form.set("file", file);
              await mutate(form, "Profil kandidat berhasil disimpan.");
            }}
          />
        </EditorDialog>
      )}
      {(modal === "schedule" || modal === "open") && (
        <EditorDialog
          title={
            modal === "open"
              ? `Buka voting ${election?.period}`
              : "Konfirmasi jadwal pemilihan"
          }
          busy={busy}
          onClose={() => setModal(null)}
        >
          <form
            className="admin-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = payload(modal === "open" ? "open" : "schedule");
              if (modal === "schedule") form.set("startsAt", startsAt);
              form.set("endsAt", endsAt);
              await mutate(
                form,
                modal === "open"
                  ? "Voting dibuka. Suara sebelumnya tetap tersimpan."
                  : "Jadwal pemilihan dikonfirmasi. Kandidat dan NIM terdaftar dikunci.",
              );
            }}
          >
            <p>
              {modal === "open"
                ? "Voting langsung dibuka sampai waktu selesai yang dipilih. Suara sebelumnya tetap tersimpan."
                : "Voting dibuka sesuai jadwal berikut. Semua waktu dalam WITA (UTC+08:00)."}{" "}
              Kandidat dan daftar pemilih dikunci setelah dikonfirmasi.
            </p>
            {modal === "schedule" && (
              <DateTimeField
                label="Mulai (WITA)"
                value={startsAt}
                onChange={setStartsAt}
                disabled={busy}
              />
            )}
            <DateTimeField
              label="Selesai (WITA)"
              value={endsAt}
              onChange={setEndsAt}
              disabled={busy}
            />
            <label className="admin-voting-check">
              <input type="checkbox" required disabled={busy} />
              Saya telah memeriksa jadwal dan data pemilihan serta memahami
              bahwa data akan dikunci setelah dikonfirmasi.
            </label>
            {error && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="admin-button admin-button-primary"
              disabled={busy}
              type="submit"
            >
              <PendingLabel
                pending={busy}
                text={
                  modal === "open" ? "Membuka voting…" : "Menyimpan jadwal…"
                }
              >
                {modal === "open" ? "Buka sekarang" : "Konfirmasi jadwal"}
              </PendingLabel>
            </button>
          </form>
        </EditorDialog>
      )}
      {modal === "close" && (
        <EditorDialog
          title="Tutup voting"
          busy={busy}
          onClose={() => setModal(null)}
        >
          <form
            className="admin-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await mutate(
                payload("close"),
                "Voting ditutup. Suara tetap tersimpan dan voting bisa dibuka kembali.",
              );
            }}
          >
            <p>
              Pemilih tidak dapat mengirim suara selama voting ditutup. Suara
              yang sudah masuk tetap tersimpan. Kamu dapat membuka voting
              kembali.
            </p>
            <label className="admin-voting-check">
              <input type="checkbox" required disabled={busy} />
              Saya mengonfirmasi penutupan periode {election?.period}.
            </label>
            {error && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="admin-button admin-button-primary"
              disabled={busy}
              type="submit"
            >
              <PendingLabel pending={busy} text="Menutup voting…">
                Konfirmasi tutup voting
              </PendingLabel>
            </button>
          </form>
        </EditorDialog>
      )}
      {modal === "reset" && election && (
        <EditorDialog
          title={`Reset suara ${election.period}`}
          busy={busy}
          onClose={() => setModal(null)}
        >
          <form
            className="admin-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = payload("reset");
              form.set("confirmation", resetConfirmation);
              await mutate(form, "Periode uji direset.");
            }}
          >
            <p id="voting-reset-warning">
              Reset menghapus {data?.stats?.ballots ?? 0} suara dari rekap aktif
              dan memulihkan {data?.stats?.consumed ?? 0} hak pilih. Periode
              kembali ke draft. Kandidat dan daftar pemilih tetap disimpan. Sesi
              memilih lama dibatalkan dan cadangan dibuat sebelum reset. Gunakan
              hanya untuk suara percobaan.
            </p>
            <label>
              Ketik RESET {election.period} untuk mengonfirmasi
              <input
                value={resetConfirmation}
                onChange={(event) => setResetConfirmation(event.target.value)}
                aria-describedby="voting-reset-warning"
                autoComplete="off"
                spellCheck={false}
                maxLength={50}
                required
                disabled={busy}
              />
            </label>
            {error && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="admin-button danger"
              type="submit"
              disabled={
                busy || resetConfirmation.trim() !== `RESET ${election.period}`
              }
            >
              <PendingLabel pending={busy} text="Mereset suara…">
                Reset suara percobaan
              </PendingLabel>
            </button>
          </form>
        </EditorDialog>
      )}
      {modal === "pin" && (
        <EditorDialog
          title="Ganti PIN Pemilihan Ketua"
          busy={busy}
          onClose={closePinModal}
        >
          <form
            className="admin-form"
            onSubmit={(event) => void saveNewPin(event)}
            aria-busy={busy}
          >
            <fieldset disabled={busy}>
              <p className="admin-meta">
                Mengganti PIN akan langsung mengunci sesi Pemilihan Ketua di
                browser atau perangkat lain.
                {pinUpdatedAt
                  ? ` Terakhir diperbarui: ${formatDate(pinUpdatedAt)} WITA.`
                  : ""}
              </p>
              <VotingPinField
                label="PIN saat ini"
                name="currentPin"
                value={currentPinInput}
                onChange={setCurrentPinInput}
                autoComplete="current-password"
              />
              <VotingPinField
                label="PIN baru"
                name="newPin"
                value={newPinInput}
                onChange={setNewPinInput}
                minLength={4}
                autoComplete="new-password"
                helperText="Minimal 4 karakter (disarankan minimal 6 karakter acak) dan berbeda dari PIN saat ini."
              />
              <VotingPinField
                label="Ulangi PIN baru"
                name="confirmPin"
                value={confirmPinInput}
                onChange={setConfirmPinInput}
                minLength={4}
                autoComplete="new-password"
              />
              {error && (
                <p className="admin-error" role="alert">
                  {error}
                </p>
              )}
              <div className="admin-actions">
                <button
                  className="admin-button"
                  type="button"
                  disabled={busy}
                  onClick={closePinModal}
                >
                  Batal
                </button>
                <button
                  className="admin-button admin-button-primary"
                  type="submit"
                  disabled={busy}
                >
                  <PendingLabel pending={busy} text="Menyimpan PIN…">
                    Simpan PIN baru
                  </PendingLabel>
                </button>
              </div>
            </fieldset>
          </form>
        </EditorDialog>
      )}
    </>
  );
}

function CandidateEditor({
  candidate,
  busy,
  error,
  onSave,
}: {
  candidate: VotingCandidate;
  busy: boolean;
  error: string;
  onSave: (
    input: {
      name: string;
      vision: string;
      missions: string[];
      programs: CandidateProgram[];
    },
    file: File | null,
  ) => Promise<void>;
}) {
  const [programs, setPrograms] = useState<CandidateProgram[]>(
    candidate.programs.length
      ? candidate.programs
      : [{ title: "", description: "", target: "" }],
  );
  const [file, setFile] = useState<File | null>(null),
    [photoPreview, setPhotoPreview] = useState<string | undefined>(
      candidate.photo || undefined,
    );
  const previewUrl = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );
  function choosePhoto(next: File | null) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = next ? URL.createObjectURL(next) : null;
    setFile(next);
    setPhotoPreview(previewUrl.current || candidate.photo || undefined);
  }
  function changeProgram(
    index: number,
    key: keyof CandidateProgram,
    value: string,
  ) {
    setPrograms((rows) =>
      rows.map((p, i) => (i === index ? { ...p, [key]: value } : p)),
    );
  }
  return (
    <form
      className="admin-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        await onSave(
          {
            name: String(form.get("name")),
            vision: String(form.get("vision")),
            missions: String(form.get("missions"))
              .split("\n")
              .map((m) => m.trim())
              .filter(Boolean),
            programs: programs.filter(
              (p) => p.title.trim() || p.description.trim() || p.target.trim(),
            ),
          },
          file,
        );
      }}
    >
      <p>
        {candidate.placeholder
          ? "Nomor urut diberikan otomatis saat disimpan."
          : `Nomor urut ${candidate.number} tetap.`}{" "}
        Satu misi per baris; maksimal 20 misi dan 20 program.
      </p>
      <label>
        Nama lengkap
        <input
          name="name"
          defaultValue={candidate.placeholder ? "" : candidate.name}
          maxLength={150}
          required
          disabled={busy}
        />
      </label>
      <div className="admin-voting-editor-photo">
        <ProfileAvatar photo={photoPreview} name="Preview foto kandidat" />
      </div>
      <label>
        Foto kandidat (JPG/PNG/WebP, maksimal 3 MB)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => choosePhoto(e.target.files?.[0] || null)}
        />
      </label>
      <label>
        Visi
        <textarea
          name="vision"
          defaultValue={candidate.placeholder ? "" : candidate.vision}
          maxLength={5000}
          rows={4}
          required
          disabled={busy}
        />
      </label>
      <label>
        Misi (satu per baris)
        <textarea
          name="missions"
          defaultValue={candidate.missions.join("\n")}
          maxLength={40000}
          rows={6}
          required
          disabled={busy}
        />
      </label>
      <h3>Program kerja</h3>
      <p>
        Cukup isi nama program. Deskripsi dan sasaran bersifat opsional. Program
        dapat dilengkapi selama periode masih draft.
      </p>
      {programs.map((p, i) => (
        <fieldset className="admin-voting-program" key={i} disabled={busy}>
          <legend>Program {i + 1}</legend>
          <label>
            Judul
            <input
              value={p.title}
              onChange={(e) => changeProgram(i, "title", e.target.value)}
              maxLength={150}
              required={Boolean(p.title || p.description || p.target)}
            />
          </label>
          <details className="admin-voting-profile-details">
            <summary>Tambahkan detail program (opsional)</summary>
            <label>
              Deskripsi (opsional)
              <textarea
                value={p.description}
                onChange={(e) =>
                  changeProgram(i, "description", e.target.value)
                }
                maxLength={5000}
                rows={3}
              />
            </label>
            <label>
              Sasaran (opsional)
              <textarea
                value={p.target}
                onChange={(e) => changeProgram(i, "target", e.target.value)}
                maxLength={1000}
                rows={2}
              />
            </label>
          </details>
          {programs.length > 1 && (
            <button
              type="button"
              className="admin-button"
              onClick={() =>
                setPrograms((rows) => rows.filter((_, index) => i !== index))
              }
            >
              Hapus program {i + 1}
            </button>
          )}
        </fieldset>
      ))}
      <button
        type="button"
        className="admin-button"
        disabled={busy || programs.length >= 20}
        onClick={() =>
          setPrograms((rows) => [
            ...rows,
            { title: "", description: "", target: "" },
          ])
        }
      >
        Tambah program kerja
      </button>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="admin-button admin-button-primary"
        disabled={busy}
        type="submit"
      >
        <PendingLabel pending={busy} text="Menyimpan profil…">
          Simpan profil kandidat
        </PendingLabel>
      </button>
    </form>
  );
}
