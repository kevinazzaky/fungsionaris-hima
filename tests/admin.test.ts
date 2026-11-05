import assert from "node:assert/strict";
import test from "node:test";
import { previewRegistrationImport } from "../src/domain/registration-import";
import {
  validateMember,
  ValidationError,
  type ImportedRegistration,
  type Member,
} from "../src/domain/admin";
import type {
  ContentRepository,
  MediaStorage,
  RegistrationImportRepository,
  RegistrationRepository,
} from "../src/domain/repositories";
import { importRegistrations } from "../src/use-cases/import-registrations";
import {
  saveMember,
  deleteContent,
  saveGalleryPhoto,
} from "../src/use-cases/manage-content";
import { register } from "../src/use-cases/register";

const row = {
  Nama: "Pengurus uji",
  NIM: "000123456",
  Angkatan: "2025",
  Divisi: "Kominfo",
  "No HP": "08123456789",
  Timestamp: "05/11/2026 09:30:00",
};

function importRepo(initial: ImportedRegistration[] = []) {
  const stored = [...initial];
  const repo: RegistrationImportRepository = {
    existingNims: async (nims, period) =>
      stored
        .filter((entry) => entry.period === period && nims.includes(entry.nim))
        .map((entry) => entry.nim),
    insertImported: async (rows) => {
      const unique = rows.filter(
        (entry) =>
          !stored.some(
            (saved) => saved.nim === entry.nim && saved.period === entry.period,
          ),
      );
      stored.push(...unique);
      return unique.length;
    },
  };
  return { repo, stored };
}

test("impor mempertahankan nol di depan dan mengubah tanggal WITA ke UTC", () => {
  const result = previewRegistrationImport([row], "2026");
  assert.deepEqual(result.issues, []);
  assert.equal(result.valid[0].nim, "000123456");
  assert.equal(result.valid[0].noHp, "08123456789");
  assert.equal(
    result.valid[0].submittedAt?.toISOString(),
    "2026-11-05T01:30:00.000Z",
  );
});

test("header XLSX lama dan jam bertitik dipetakan lengkap tanpa kehilangan data", () => {
  const result = previewRegistrationImport(
    [
      {
        "Waktu Submit": "5/11/2026, 09.30.00",
        "Nama Lengkap": "Pendaftar uji",
        NIM: "000123456",
        Angkatan: "2025",
        "Tempat, Tanggal Lahir": "Denpasar, 1 Januari 2005",
        "Jenis Kelamin": "Laki-laki",
        Alamat: "Alamat uji",
        "No. WhatsApp / HP": "08123456789",
        "ID Line": "akun-uji",
        "Pengalaman Organisasi": "Kegiatan uji",
        "Minat dan Skill": "Desain",
        "Alasan Bergabung HIMA TI": "Belajar berorganisasi",
        "Divisi yang Diminati": "Kominfo",
        "Alasan Memilih Divisi": "Mengembangkan kemampuan",
        "Nama Berkas Lampiran": "lampiran.pdf",
      },
    ],
    "2026",
  );
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.ignoredColumns, []);
  assert.equal(
    result.valid[0].submittedAt?.toISOString(),
    "2026-11-05T01:30:00.000Z",
  );
  assert.equal(result.valid[0].noHp, "08123456789");
  assert.equal(result.valid[0].alasanBergabung, "Belajar berorganisasi");
  assert.equal(result.valid[0].berkas, "lampiran.pdf");
});

test("timestamp kosong tetap tidak tercatat dan kolom camelCase dikenali", () => {
  const result = previewRegistrationImport(
    [
      {
        nama: row.Nama,
        nim: row.NIM,
        angkatan: "2025",
        divisi: "hh",
        timestamp: "",
      },
    ],
    "2025/2026",
  );
  assert.equal(result.valid[0].submittedAt, null);
  assert.equal(result.valid[0].period, "2025/2026");
});

test("kolom yang tidak dikenali dilaporkan agar tidak diam-diam hilang saat migrasi", () => {
  const result = previewRegistrationImport(
    [{ ...row, "Kolom tambahan": "perlu dipetakan" }],
    "2026",
  );
  assert.deepEqual(result.ignoredColumns, ["Kolom tambahan"]);
});

test("impor menolak tanggal overflow, timestamp ambigu, NIM rusak, dan kolom wajib kosong", () => {
  for (const invalid of [
    { ...row, Timestamp: "31/02/2026" },
    { ...row, Timestamp: "05/11/2026 24:30" },
    { ...row, Timestamp: "2026-11-05 09:30" },
    { ...row, Timestamp: "2026-02-31T09:30:00+08:00" },
    { ...row, NIM: "123abc" },
    { ...row, Nama: "" },
    { ...row, Angkatan: "25" },
  ]) {
    const result = previewRegistrationImport([invalid], "2026");
    assert.equal(result.valid.length, 0);
    assert.equal(result.issues[0].row, 2);
  }
});

test("duplikat dalam satu berkas dilaporkan dengan nomor baris", () => {
  const result = previewRegistrationImport([row, row], "2026");
  assert.equal(result.valid.length, 1);
  assert.equal(result.issues[0].row, 3);
});

test("pratinjau tidak menulis, impor ulang idempoten, periode lain tetap diterima", async () => {
  const { repo, stored } = importRepo();
  const preview = await importRegistrations(repo, [row], "2026", false);
  assert.equal(preview.ready, 1);
  assert.equal(stored.length, 0);
  assert.equal(
    (await importRegistrations(repo, [row], "2026", true)).imported,
    1,
  );
  const again = await importRegistrations(repo, [row], "2026", true);
  assert.equal(again.imported, 0);
  assert.equal(again.duplicates, 1);
  assert.equal(
    (await importRegistrations(repo, [row], "2027", true)).imported,
    1,
  );
  assert.equal(stored.length, 2);
});

test("impor bermasalah tidak menulis sebagian data", async () => {
  const { repo, stored } = importRepo();
  await assert.rejects(
    importRegistrations(repo, [row, { ...row, NIM: "rusak" }], "2026", true),
    ValidationError,
  );
  assert.equal(stored.length, 0);
});

test("impor membatasi ukuran batch dan format periode", () => {
  assert.throws(() => previewRegistrationImport([], "2026"), ValidationError);
  assert.throws(
    () => previewRegistrationImport(Array(2001).fill(row), "2026"),
    ValidationError,
  );
  assert.throws(
    () => previewRegistrationImport([row], "periode terbaru"),
    ValidationError,
  );
});

const original: Member = {
  id: "old",
  name: "Pengurus uji",
  role: "Anggota",
  group: "kominfo",
  sortOrder: 0,
  isPublished: true,
  photoPath: "members/old.webp",
};
const input = {
  name: "Nama diperbarui",
  role: "Koordinator",
  group: "kominfo",
  sortOrder: 1,
  isPublished: false,
};

function contentRepo() {
  const events: string[] = [];
  let current: Member | null = { ...original };
  let failSave = false;
  const repository: ContentRepository = {
    members: async () => (current ? [current] : []),
    gallery: async () => [],
    member: async () => current,
    photo: async () => null,
    saveMember: async (data, _id, photoPath) => {
      events.push("save");
      if (failSave) throw new Error("database unavailable");
      current = {
        ...original,
        ...data,
        photoPath: photoPath === undefined ? original.photoPath : photoPath,
      };
      return current;
    },
    savePhoto: async () => {
      throw new Error("not used");
    },
    deleteMember: async () => {
      events.push("delete");
      current = null;
    },
    deletePhoto: async () => {},
  };
  const storage: MediaStorage = {
    upload: async () => {
      events.push("upload");
      return "members/new.webp";
    },
    remove: async (path) => {
      events.push(`remove:${path}`);
    },
  };
  return {
    repository,
    storage,
    events,
    fail: () => {
      failSave = true;
    },
  };
}

test("edit tanpa foto baru mempertahankan berkas lama", async () => {
  const { repository, storage, events } = contentRepo();
  const updated = await saveMember(repository, storage, input, original.id);
  assert.equal(updated.photoPath, original.photoPath);
  assert.equal(updated.isPublished, false);
  assert.deepEqual(events, ["save"]);
});

test("foto lama dihapus setelah metadata pengganti berhasil disimpan", async () => {
  const { repository, storage, events } = contentRepo();
  await saveMember(
    repository,
    storage,
    input,
    original.id,
    new File(["photo"], "photo.png"),
  );
  assert.deepEqual(events, ["upload", "save", "remove:members/old.webp"]);
});

test("database gagal: foto baru dibersihkan dan foto lama dipertahankan", async () => {
  const { repository, storage, events, fail } = contentRepo();
  fail();
  await assert.rejects(
    saveMember(
      repository,
      storage,
      input,
      original.id,
      new File(["photo"], "photo.png"),
    ),
    /database unavailable/,
  );
  assert.deepEqual(events, ["upload", "save", "remove:members/new.webp"]);
});

test("hapus fungsionaris menghapus metadata sebelum berkas", async () => {
  const { repository, storage, events } = contentRepo();
  await deleteContent(repository, storage, "members", original.id);
  assert.deepEqual(events, ["delete", "remove:members/old.webp"]);
});

test("validasi menolak kelompok palsu, publikasi bukan boolean, dan urutan tidak valid", () => {
  for (const invalid of [
    { ...input, group: "__proto__" },
    { ...input, isPublished: "false" },
    { ...input, sortOrder: -1 },
    { ...input, sortOrder: 1.5 },
  ]) {
    assert.throws(() => validateMember(invalid), ValidationError);
  }
});

test("foto baru di galeri wajib memiliki unggahan", async () => {
  const { repository, storage, events } = contentRepo();
  await assert.rejects(
    saveGalleryPhoto(repository, storage, {
      title: "Kegiatan",
      alt: "Dokumentasi kegiatan",
      sortOrder: 0,
      isPublished: true,
    }),
    ValidationError,
  );
  assert.deepEqual(events, []);
});

test("pendaftaran baru gagal menyimpan database: unggahan PDF dibersihkan", async () => {
  const cleanup: string[] = [];
  const repository = {
    existingNims: async () => [],
    create: async () => {
      throw new Error("database unavailable");
    },
  } as unknown as RegistrationRepository;
  const data = previewRegistrationImport([row], "2026").valid[0];
  await assert.rejects(
    register(
      repository,
      {
        upload: async () => "new.pdf",
        remove: async (path) => {
          cleanup.push(path);
        },
      },
      data,
      "2026",
      new File(["%PDF-"], "file.pdf"),
    ),
    /database unavailable/,
  );
  assert.deepEqual(cleanup, ["new.pdf"]);
});

test("pendaftaran duplikat tidak mengunggah PDF", async () => {
  let uploaded = false;
  const repository = {
    existingNims: async () => [row.NIM],
  } as unknown as RegistrationRepository;
  const data = previewRegistrationImport([row], "2026").valid[0];
  await assert.rejects(
    register(
      repository,
      {
        upload: async () => {
          uploaded = true;
          return "file.pdf";
        },
        remove: async () => {},
      },
      data,
      "2026",
      new File(["%PDF-"], "file.pdf"),
    ),
    ValidationError,
  );
  assert.equal(uploaded, false);
});
test("hero memakai folder terpisah dan mengompensasi upload sebelum mengganti atau menghapus foto lama", async () => {
  const { repository } = contentRepo();
  const events: string[] = [];
  const input = {
    title: "Dokumentasi kegiatan",
    alt: "Kegiatan HIMA",
    sortOrder: 2,
    isPublished: false,
  };
  const old = {
    ...input,
    id: "hero-test",
    imagePath: "hero/old.webp",
    imageUrl: "/old.webp",
  };
  repository.photo = async () => old;
  repository.savePhoto = async () => {
    events.push("save-failed");
    throw new Error("database unavailable");
  };
  repository.deletePhoto = async () => {
    events.push("delete");
  };
  const storage: MediaStorage = {
    upload: async (_file, folder) => {
      events.push(`upload:${folder}`);
      return "hero/new.webp";
    },
    remove: async (path) => {
      events.push(`remove:${path}`);
    },
  };
  const file = new File(["image"], "photo.webp");
  await assert.rejects(
    saveGalleryPhoto(repository, storage, input, old.id, file, "hero"),
    /database unavailable/,
  );
  assert.deepEqual(events, [
    "upload:hero",
    "save-failed",
    "remove:hero/new.webp",
  ]);
  events.length = 0;
  repository.savePhoto = async (data, id, imagePath) => {
    events.push("save");
    return { ...old, ...data, id: id!, imagePath: imagePath ?? old.imagePath };
  };
  await saveGalleryPhoto(repository, storage, input, old.id, file, "hero");
  assert.deepEqual(events, ["upload:hero", "save", "remove:hero/old.webp"]);
  events.length = 0;
  await deleteContent(repository, storage, "hero", old.id);
  assert.deepEqual(events, ["delete", "remove:hero/old.webp"]);
});
