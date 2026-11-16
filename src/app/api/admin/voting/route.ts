import { requireAdmin } from "@/data/auth";
import {
  apiError,
  assertSameOrigin,
  assertUuid,
  readForm,
} from "@/lib/api-response";
import { votingJson } from "@/lib/voting-api";
import { votingRepository } from "@/data/repositories/voting";
import {
  parseVoterCsv,
  validateCandidate,
  parseVotingSchedule,
} from "@/domain/voting";
import { ValidationError } from "@/domain/admin";
import { selectVotingPeriod } from "@/use-cases/manage-voting-period";
import { voterKey } from "@/use-cases/voting-token";
import { uploadImage, removeFile } from "@/data/supabase/storage";
import { MEDIA_BUCKET } from "@/lib/backend-config";
import { votingReady } from "@/data/voting";
import { createVotingRecap } from "@/lib/voting-export";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const id = params.get("id") || undefined;
    if (id) assertUuid(id);
    const dashboard = await votingRepository.dashboard(id);
    if (params.get("export") === "true") {
      return new Response(
        new Uint8Array(createVotingRecap(dashboard)),
        {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition":
              `attachment; filename="rekap-pemilihan-${dashboard.election!.period.replaceAll("/", "-")}.xlsx"`,
            "Cache-Control": "no-store",
          },
        },
      );
    }
    return votingJson(dashboard);
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  let uploaded: string | undefined,
    saved = false;
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const form = await readForm(request);
    const action = form.get("action");
    if (action === "create")
      return votingJson(
        {
          id: await selectVotingPeriod(
            votingRepository,
            form.get("period"),
            admin.id,
          ),
        },
        201,
      );
    const id = String(form.get("id") || "");
    assertUuid(id);
    if (action === "preview" || action === "import") {
      const csv = form.get("csv");
      if (typeof csv !== "string")
        throw new ValidationError("CSV tidak valid.");
      const preview = parseVoterCsv(csv, await votingRepository.period(id));
      if (action === "preview")
        return votingJson({
          total: preview.total,
          valid: preview.nims.length,
          issues: preview.issues,
          sample: preview.nims
            .slice(0, 10)
            .map((n) => `${"*".repeat(n.length - 3)}${n.slice(-3)}`),
        });
      if (preview.issues.length)
        throw new ValidationError(
          "Perbaiki seluruh kesalahan CSV sebelum mengimpor.",
        );
      const secret = process.env.VOTING_SECRET;
      if (!secret || secret.length < 32)
        throw new ValidationError(
          "VOTING_SECRET server minimal 32 karakter belum diatur.",
        );
      return votingJson({
        imported: await votingRepository.importVoters(
          id,
          preview.voters.map(({ nim, name }) => ({ voterKey: voterKey(nim, id, secret), name })),
          admin.id,
        ),
      });
    }
    if (action === "candidate") {
      const rawNumber = form.get("number");
      const number = rawNumber === null ? undefined : Number(rawNumber);
      if (
        number !== undefined &&
        (!Number.isInteger(number) || number < 1 || number > 2147483647)
      )
        throw new ValidationError("Nomor urut tidak valid.");
      const raw: unknown = JSON.parse(String(form.get("data") || ""));
      if (!raw || typeof raw !== "object" || Array.isArray(raw))
        throw new ValidationError("Profil tidak valid.");
      const input = validateCandidate(raw as Record<string, unknown>);
      const file = form.get("file");
      if (file instanceof File && file.size)
        uploaded = await uploadImage(file, "candidates");
      const previous = await votingRepository.saveCandidate(
        id,
        number,
        input,
        uploaded,
        admin.id,
      );
      saved = true;
      if (uploaded && previous) {
        try {
          await removeFile(MEDIA_BUCKET, previous);
        } catch {
          console.error("Voting media cleanup pending");
        }
      }
      return votingJson({ success: true });
    }
    if (action === "schedule") {
      if (!votingReady())
        throw new ValidationError(
          "Konfigurasi voting belum siap. Minta pengelola memeriksa mode uji dan kunci server.",
        );
      const { startsAt, endsAt } = parseVotingSchedule(
        form.get("startsAt"),
        form.get("endsAt"),
      );
      await votingRepository.schedule(id, startsAt, endsAt, admin.id);
      return votingJson({ success: true });
    }
    if (action === "close") {
      await votingRepository.close(id, admin.id);
      return votingJson({ success: true });
    }
    throw new ValidationError("Tindakan tidak dikenal.");
  } catch (e) {
    if (uploaded && !saved) {
      try {
        await removeFile(MEDIA_BUCKET, uploaded);
      } catch {
        console.error("Voting media cleanup pending");
      }
    }
    return apiError(e);
  }
}
