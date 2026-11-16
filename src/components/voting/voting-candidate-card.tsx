"use client";

import Image from "next/image";
import { useId } from "react";
import type { VotingCandidate } from "@/domain/voting";

export function VotingCandidateCard({
  candidate: c,
  open,
  canVote,
  onToggle,
  onSelect,
}: {
  candidate: VotingCandidate;
  open: boolean;
  canVote: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const panelId = useId();
  return (
    <article
      className="voting-poster"
      data-open={open}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          onToggle();
        }
      }}
    >
      <div className="voting-poster-image">
        {c.photo ? (
          <Image
            src={c.photo}
            alt={`Foto ${c.name}`}
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <p className="voting-poster-empty">Foto belum ditambahkan</p>
        )}
        <div className="voting-poster-top">
          <span className="voting-poster-number">
            {String(c.number).padStart(2, "0")}
          </span>
          {canVote && (
            <button className="voting-primary" type="button" onClick={onSelect}>
              Pilih kandidat<span className="sr-only"> {c.number}</span>
            </button>
          )}
        </div>
        <div className="voting-poster-caption">
          <h3>{c.name}</h3>
          <button
            className="voting-poster-profile"
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggle}
          >
            {open ? "Tutup profil" : "Lihat Profil"}
            <span aria-hidden="true">{open ? "−" : "→"}</span>
          </button>
        </div>
      </div>
      {open && (
        <section
          id={panelId}
          aria-label={`Profil ${c.name}`}
          className="voting-poster-details"
        >
          <div className="voting-poster-details-heading">
            <h4>Profil kandidat {c.number}</h4>
            <button
              type="button"
              className="voting-secondary"
              onClick={onToggle}
            >
              Tutup profil
            </button>
          </div>
          <section className="voting-poster-statement">
            <h4>Visi</h4>
            <p>{c.vision}</p>
          </section>
          <section className="voting-poster-statement">
            <h4>Misi</h4>
            {c.missions.length ? (
              <ol>
                {c.missions.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ol>
            ) : (
              <p>Misi belum diisi panitia.</p>
            )}
          </section>
          <section className="voting-poster-programs">
            <h4>Program kerja</h4>
            {c.programs.length ? (
              c.programs.map((p, i) => (
                <section className="voting-program" key={i}>
                  <h5>{p.title}</h5>
                  {p.description && <p>{p.description}</p>}
                  {p.target && (
                    <p className="voting-program-target">
                      <strong>Sasaran program</strong>
                      {p.target}
                    </p>
                  )}
                </section>
              ))
            ) : null}
          </section>
        </section>
      )}
    </article>
  );
}
