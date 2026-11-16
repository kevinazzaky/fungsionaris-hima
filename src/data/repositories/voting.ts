import "server-only";
import { getPrisma } from "@/data/prisma";
import { mediaUrl } from "@/data/supabase/storage";
import type { Prisma } from "@/generated/prisma/client";
import type { VotingElection, CandidateInput } from "@/domain/voting";
import { assertVotingCandidatesReady } from "@/domain/voting";
import { ValidationError } from "@/domain/admin";
import { loadAdminVotingResults } from "@/use-cases/voting";
import { assertCanActivateVotingPeriod } from "@/use-cases/manage-voting-period";

type ElectionRow = Prisma.ElectionGetPayload<{ include: { candidates: true } }>;

function publicElection(e: ElectionRow): VotingElection {
  return {
    id: e.id,
    period: e.period,
    status: e.status,
    startsAt: e.startsAt?.toISOString() || null,
    endsAt: e.endsAt?.toISOString() || null,
    candidates: e.candidates
      .filter((c) => !c.placeholder)
      .sort((a, b) => a.number - b.number)
      .map((c) => ({
        id: c.id,
        number: c.number,
        name: c.name || `Kandidat ${c.number} (placeholder)`,
        vision: c.vision || "Visi akan diisi oleh panitia.",
        missions: c.missions,
        programs: c.programs as CandidateInput["programs"],
        photo: c.photoPath ? mediaUrl(c.photoPath) : null,
        placeholder: c.placeholder,
      })),
  };
}

async function lockDraft(tx: Prisma.TransactionClient, id: string) {
  const rows = await tx.$queryRaw<
    { status: string }[]
  >`SELECT status FROM elections WHERE id=${id}::uuid FOR UPDATE`;
  if (!rows.length || rows[0].status !== "draft")
    throw new ValidationError(
      "Kandidat, NIM terdaftar dan jadwal sudah dikunci. Hanya draft yang dapat diubah.",
    );
}

async function audit(
  tx: Prisma.TransactionClient,
  electionId: string,
  actorId: string,
  action: string,
) {
  await tx.votingAuditLog.create({ data: { electionId, actorId, action } });
}

export const votingRepository = {
  findPeriod: (period: string) =>
    getPrisma().election.findUnique({
      where: { period },
      select: { id: true },
    }),
  async latest() {
    const e = await getPrisma().election.findFirst({
      where: { activeSettings: { is: { id: "main" } } },
      include: { candidates: true },
    });
    return e ? publicElection(e) : null;
  },
  async activate(id: string, actorId: string) {
    await getPrisma().$transaction(async (tx) => {
      const settings = await tx.$queryRaw<{ election_id: string | null }[]>`
        SELECT election_id FROM voting_settings WHERE id='main' FOR UPDATE`;
      if (!settings.length) throw new ValidationError("Pengaturan periode aktif belum tersedia.");
      const target = await tx.election.findUnique({ where: { id }, select: { id: true } });
      if (!target) throw new ValidationError("Pemilihan tidak ditemukan.");
      if (settings[0].election_id === id) return;
      if (settings[0].election_id)
        await tx.$queryRaw`SELECT id FROM elections WHERE id=${settings[0].election_id}::uuid FOR SHARE`;
      const current = settings[0].election_id
        ? await tx.election.findUnique({ where: { id: settings[0].election_id } }) : null;
      const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      assertCanActivateVotingPeriod(current, id, now.getTime());
      await tx.votingSettings.update({ where: { id: "main" }, data: { electionId: id } });
      await audit(tx, id, actorId, "public_period_activated");
    });
  },
  async create(period: string, actorId: string) {
    return getPrisma().$transaction(async (tx) => {
      const e = await tx.election.create({
        data: { period },
      });
      await audit(tx, e.id, actorId, "draft_created");
      return e.id;
    });
  },
  async dashboard(id?: string) {
    return getPrisma().$transaction(async (tx) => {
      const elections = await tx.election.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, period: true },
      });
      const active = await tx.votingSettings.findUnique({ where: { id: "main" } });
      const activeElectionId = active?.electionId || null;
      const selectedId = id || activeElectionId || elections[0]?.id;
      if (!selectedId)
        return {
          elections,
          activeElectionId,
          election: null,
          stats: null,
          results: null,
          logs: [],
          health: [],
          limits: [],
          voters: [],
        };
      await tx.$queryRaw`SELECT id FROM elections WHERE id=${selectedId}::uuid FOR SHARE`;
      const e = await tx.election.findUnique({
        where: { id: selectedId },
        include: { candidates: true },
      });
      if (!e) throw new ValidationError("Pemilihan tidak ditemukan.");
      const total = await tx.eligibleVoter.count({
        where: { electionId: e.id, eligible: true },
      });
      const consumed = await tx.eligibleVoter.count({
        where: { electionId: e.id, consumed: true },
      });
      const ballots = await tx.ballot.count({ where: { electionId: e.id } });
      const results = await loadAdminVotingResults(e.status, () =>
        tx.ballot.groupBy({
          by: ["candidateId"],
          where: { electionId: e.id },
          _count: { _all: true },
        }),
      );
      const logs = await tx.votingAuditLog.findMany({
        where: { electionId: e.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, action: true, createdAt: true },
      });
      const health = await tx.votingHealth.findMany({
        select: { code: true, count: true, lastSeen: true },
      });
      const limits = await tx.votingRateLimit.groupBy({
        by: ["scope"],
        _sum: { denied: true },
        where: { expiresAt: { gt: new Date() } },
      });
      return {
        elections,
        activeElectionId,
        election: publicElection(e),
        stats: {
          total,
          consumed,
          ballots,
          participation: total ? Math.round((ballots / total) * 1000) / 10 : 0,
        },
        results,
        voters: await tx.eligibleVoter.findMany({
          where: { electionId: e.id, name: { not: null } },
          select: { voterKey: true, name: true, consumed: true },
          orderBy: { name: "asc" },
        }),
        logs: logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
        health: health.map((h) => ({
          ...h,
          lastSeen: h.lastSeen.toISOString(),
        })),
        limits,
      };
    });
  },
  async period(id: string) {
    const e = await getPrisma().election.findUnique({ where: { id } });
    if (!e) throw new ValidationError("Pemilihan tidak ditemukan.");
    return e.period;
  },
  async importVoters(id: string, voters: { voterKey: string; name: string | null }[], actorId: string) {
    return getPrisma().$transaction(async (tx) => {
      await lockDraft(tx, id);
      await tx.$executeRaw`
        INSERT INTO eligible_voters (election_id, voter_key, name)
        SELECT ${id}::uuid, entry."voterKey", entry.name
        FROM jsonb_to_recordset(${JSON.stringify(voters)}::jsonb)
          AS entry("voterKey" text, name text)
        ON CONFLICT (election_id, voter_key) DO UPDATE
        SET name = COALESCE(EXCLUDED.name, eligible_voters.name)
      `;
      await audit(tx, id, actorId, `dpt_imported:${voters.length}`);
      return voters.length;
    });
  },
  async saveCandidate(
    electionId: string,
    number: number | undefined,
    input: CandidateInput,
    photoPath: string | undefined,
    actorId: string,
  ) {
    return getPrisma().$transaction(async (tx) => {
      await lockDraft(tx, electionId);
      const previous =
        number !== undefined
          ? await tx.votingCandidate.findUnique({
              where: { electionId_number: { electionId, number } },
            })
          : await tx.votingCandidate.findFirst({
              where: { electionId, placeholder: true },
              orderBy: { number: "asc" },
            });
      if (number !== undefined && !previous)
        throw new ValidationError("Kandidat tidak ditemukan.");
      const data = {
        ...input,
        programs: input.programs,
        placeholder: false,
        ...(photoPath ? { photoPath } : {}),
      };
      if (previous) {
        await tx.votingCandidate.update({ where: { id: previous.id }, data });
      } else {
        const maximum = await tx.votingCandidate.aggregate({
          where: { electionId },
          _max: { number: true },
        });
        number = (maximum._max.number || 0) + 1;
        if (number > 2147483647)
          throw new ValidationError("Nomor urut tidak dapat ditambahkan.");
        await tx.votingCandidate.create({
          data: { ...data, electionId, number },
        });
      }
      await audit(
        tx,
        electionId,
        actorId,
        `candidate_${number !== undefined && previous ? "updated" : "added"}:${previous?.number ?? number}`,
      );
      return previous?.photoPath || null;
    });
  },
  async schedule(id: string, startsAt: Date | null, endsAt: Date, actorId: string) {
    return getPrisma().$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ status: string; ends_at: Date | null; now: Date }[]>`
        SELECT status,ends_at,clock_timestamp() AS now FROM elections WHERE id=${id}::uuid FOR UPDATE`;
      const current = rows[0];
      if (!current) throw new ValidationError("Pemilihan tidak ditemukan.");
      if (current.status !== "draft" && current.status !== "closed" &&
          !(current.status === "scheduled" && current.ends_at && current.ends_at <= current.now))
        throw new ValidationError("Tutup voting sebelum mengubah jadwal.");
      const candidates = await tx.votingCandidate.findMany({
        where: { electionId: id, placeholder: false },
      });
      assertVotingCandidatesReady(candidates);
      if (
        !(await tx.eligibleVoter.count({
          where: { electionId: id, eligible: true },
        }))
      )
        throw new ValidationError("Tambahkan NIM terdaftar sebelum mengonfirmasi jadwal.");
      if (await tx.eligibleVoter.count({ where: { electionId: id, eligible: true, name: null } }))
        throw new ValidationError("Lengkapi nama semua pemilih sebelum mengonfirmasi jadwal.");
      const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      const start = startsAt ?? now;
      if ((startsAt && startsAt <= now) || endsAt <= start)
        throw new ValidationError(
          startsAt ? "Awal harus di masa depan dan akhir harus setelah awal." : "Waktu selesai harus setelah waktu saat ini.",
        );
      await tx.election.update({
        where: { id },
        data: { startsAt: start, endsAt, status: "scheduled" },
      });
      await audit(
        tx,
        id,
        actorId,
        startsAt ? "schedule_confirmed_profiles_and_dpt_locked" : "voting_opened_preserving_ballots",
      );
    });
  },
  async close(id: string, actorId: string) {
    return getPrisma().$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { status: string }[]
      >`SELECT status FROM elections WHERE id=${id}::uuid FOR UPDATE`;
      if (rows[0]?.status !== "scheduled")
        throw new ValidationError(
          "Hanya pemilihan terjadwal yang dapat ditutup.",
        );
      await tx.election.update({ where: { id }, data: { status: "closed" } });
      await audit(tx, id, actorId, "voting_closed_preserving_ballots");
    });
  },
  async reset(id: string, confirmation: string, actorId: string) {
    try {
      const [result] = await getPrisma().$queryRaw<{
        ballots_removed: number; rights_restored: number; audit_action: string;
      }[]>`SELECT * FROM reset_hima_voting_test_period(${id}::uuid,${actorId}::uuid,${confirmation})`;
      return { ballotsRemoved: result.ballots_removed, rightsRestored: result.rights_restored, action: result.audit_action };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("voting_reset_requires_closed")) throw new ValidationError("Tutup voting sebelum mereset suara.");
      if (message.includes("voting_reset_confirmation")) throw new ValidationError("Konfirmasi reset tidak sesuai periode.");
      if (message.includes("voting_reset_audit_mismatch")) throw new ValidationError("Jumlah suara dan hak terpakai tidak sesuai. Hubungi pengelola sebelum reset.");
      if (message.includes("voting_reset_not_found")) throw new ValidationError("Pemilihan tidak ditemukan.");
      throw error;
    }
  },
  async voterEligibility(electionId: string, key: string) {
    const voter = await getPrisma().eligibleVoter.findUnique({
      where: { electionId_voterKey: { electionId, voterKey: key } },
      select: { eligible: true, consumed: true, name: true, election: { select: { tokenVersion: true } } },
    });
    return voter ? { eligible: voter.eligible, consumed: voter.consumed, name: voter.name, tokenVersion: voter.election.tokenVersion } : null;
  },
  async cast(electionId: string, key: string, candidateId: string, tokenVersion = 0) {
    const result = await getPrisma().$queryRaw<
      { accepted: boolean }[]
    >`SELECT cast_hima_ballot(${electionId}::uuid,${key},${candidateId}::uuid,${tokenVersion}::integer) AS accepted`;
    return result[0].accepted;
  },
  async rate(key: string, scope: string, limit: number, windowSeconds = 600) {
    const result = await getPrisma().$queryRaw<
      { allowed: boolean }[]
    >`SELECT voting_take_rate(${key},${scope},${limit}::integer,${windowSeconds}::integer) AS allowed`;
    return result[0].allowed;
  },
  async health(
    code: "request_rejected" | "service_error",
  ) {
    try {
      await getPrisma().votingHealth.upsert({
        where: { code },
        create: { code },
        update: { count: { increment: 1 }, lastSeen: new Date() },
      });
    } catch {
      console.error("Voting health unavailable");
    }
  },
};

export type VotingDashboardData = Awaited<
  ReturnType<typeof votingRepository.dashboard>
>;
