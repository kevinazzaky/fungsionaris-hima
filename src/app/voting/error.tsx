"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <h1 className="font-heading text-2xl">
        Informasi pemilihan belum dapat dimuat
      </h1>
      <p className="mt-4">Periksa koneksi dan coba kembali.</p>
      <button
        className="mt-6 min-h-11 rounded-full bg-amber-400 px-6 font-semibold text-zinc-950 focus-visible:outline-2"
        type="button"
        onClick={reset}
      >
        Coba lagi
      </button>
    </section>
  );
}
