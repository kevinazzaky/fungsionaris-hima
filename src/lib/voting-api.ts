import "server-only";
import { createHmac } from "node:crypto";
import { assertSameOrigin, assertUuid, readJson } from "@/lib/api-response";
import { AccessError } from "@/data/auth";
import { votingReady } from "@/data/voting";
import { votingRepository } from "@/data/repositories/voting";
import { normalizeNim, electionState } from "@/domain/voting";
import { ValidationError } from "@/domain/admin";
import { prepareVotingSession } from "@/use-cases/voting";
import { readVotingToken, voterKey } from "@/use-cases/voting-token";

export function votingJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

export async function publicVotingRequest(
  request: Request,
  action: "check" | "cast",
) {
  try {
    assertSameOrigin(request);
    if (!votingReady())
      return votingJson(
        { error: "Layanan voting prototipe belum diaktifkan oleh panitia." },
        503,
      );
    const secret = process.env.VOTING_SECRET!;
    const network =
      process.env.VERCEL === "1"
        ? request.headers.get("x-vercel-forwarded-for") || "shared"
        : "shared";
    const bucket = createHmac("sha256", secret)
      .update(`network:${action}:${network}`)
      .digest("hex");
    if (
      !(await votingRepository.rate(
        bucket,
        action,
        action === "check" ? 30 : 20,
      ))
    )
      return votingJson(
        {
          error:
            "Terlalu banyak permintaan. Tunggu 10 menit sebelum mencoba kembali.",
        },
        429,
      );
    const input = await readJson(request, 4096);
    if (action === "check") {
      const nim = normalizeNim(input.nim);
      const election = await votingRepository.latest();
      if (!election || electionState(election) !== "open")
        return votingJson(
          { error: "Pemungutan suara sedang tidak dibuka." },
          409,
        );
      const key = voterKey(nim, election.id, secret);
      if (!(await votingRepository.rate(`nim:${key}`, "nim", 5)))
        return votingJson(
          {
            error:
              "Permintaan belum dapat diproses. Coba kembali nanti atau hubungi panitia.",
          },
          429,
        );
      return votingJson(
        await prepareVotingSession(votingRepository, nim, election.id, secret),
      );
    }
    const token = readVotingToken(input.token, secret);
    if (typeof input.candidateId !== "string")
      throw new ValidationError("Kandidat tidak valid.");
    assertUuid(input.candidateId);
    if (!(await votingRepository.rate(`cast:${token.voterKey}`, "submit", 5)))
      return votingJson(
        {
          error:
            "Permintaan belum dapat diproses. Coba kembali nanti atau hubungi panitia.",
        },
        429,
      );
    if (
      !(await votingRepository.cast(
        token.electionId,
        token.voterKey,
        input.candidateId,
      ))
    ) {
      await votingRepository.health("request_rejected");
      return votingJson(
        {
          error:
            "Suara tidak dapat diproses. Pastikan periode dan hak pilih sesuai, atau hubungi panitia. Jangan mengirim ulang jika sebelumnya sudah menerima konfirmasi sukses.",
        },
        409,
      );
    }
    return votingJson({ success: true });
  } catch (error) {
    if (error instanceof AccessError)
      return votingJson({ error: "Permintaan tidak diizinkan." }, 403);
    const validation = error instanceof ValidationError;
    await votingRepository.health(
      validation ? "request_rejected" : "service_error",
    );
    return votingJson(
      {
        error: validation
          ? error.message
          : "Permintaan belum dapat diproses. Coba kembali nanti atau hubungi panitia.",
      },
      validation ? 400 : 503,
    );
  }
}
