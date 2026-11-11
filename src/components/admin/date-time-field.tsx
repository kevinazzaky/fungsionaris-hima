"use client";

import { useId, useRef, useState } from "react";
import { calendarDays, shiftMonth } from "@/domain/calendar";

const dayFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "full",
  timeZone: "UTC",
});
const monthFormat = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function DateTimeField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const id = useId();
  const today = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Makassar",
  });
  const date = value.split("T")[0];
  const [hour = "08", minute = "00"] = (value.split("T")[1] || "08:00").split(
    ":",
  );
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(date.slice(0, 7) || today.slice(0, 7));
  const trigger = useRef<HTMLButtonElement>(null);
  const calendar = useRef<HTMLDivElement>(null);
  function choose(next: string) {
    onChange(`${next}T${hour}:${minute}`);
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <fieldset className="admin-datetime" disabled={disabled}>
      <legend>{label}</legend>
      <div className="admin-datetime-controls">
        <div>
          <span id={`${id}-label`} className="admin-datetime-label">
            Tanggal
          </span>
          <button
            ref={trigger}
            type="button"
            className="admin-datetime-trigger"
            aria-labelledby={`${id}-label ${id}-value`}
            aria-expanded={open}
            aria-controls={`${id}-calendar`}
            onClick={() => {
              if (!open) setMonth(date.slice(0, 7) || today.slice(0, 7));
              setOpen(!open);
            }}
          >
            <span id={`${id}-value`}>
              {date
                ? new Intl.DateTimeFormat("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(`${date}T00:00:00Z`))
                : "Pilih tanggal"}
            </span>
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <rect x="3" y="5" width="18" height="16" rx="3" />
              <path d="M7 3v4m10-4v4M3 11h18" />
            </svg>
          </button>
        </div>
        <div className="admin-datetime-time">
          <label>
            Jam
            <select
              value={hour}
              disabled={disabled || !date}
              onChange={(event) =>
                onChange(`${date}T${event.target.value}:${minute}`)
              }
            >
              {Array.from({ length: 24 }, (_, i) =>
                String(i).padStart(2, "0"),
              ).map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </label>
          <span aria-hidden="true">:</span>
          <label>
            Menit
            <select
              value={minute}
              disabled={disabled || !date}
              onChange={(event) =>
                onChange(`${date}T${hour}:${event.target.value}`)
              }
            >
              {Array.from({ length: 60 }, (_, i) =>
                String(i).padStart(2, "0"),
              ).map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {open && (
        <div
          id={`${id}-calendar`}
          ref={calendar}
          className="admin-calendar"
          role="group"
          aria-label={`Kalender ${label}`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
              trigger.current?.focus();
            }
          }}
        >
          <div className="admin-calendar-header">
            <button
              type="button"
              aria-label="Bulan sebelumnya"
              disabled={month === "1900-01"}
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              ‹
            </button>
            <strong aria-live="polite">
              {monthFormat.format(new Date(`${month}-01T00:00:00Z`))}
            </strong>
            <button
              type="button"
              aria-label="Bulan berikutnya"
              disabled={month === "9999-12"}
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              ›
            </button>
          </div>
          <div className="admin-calendar-grid">
            {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
              <span
                className="admin-calendar-weekday"
                aria-hidden="true"
                key={d}
              >
                {d}
              </span>
            ))}
            {calendarDays(month).map((day, i) =>
              day ? (
                <button
                  key={day.date}
                  type="button"
                  data-date={day.date}
                  data-selected={day.date === date}
                  aria-label={dayFormat.format(
                    new Date(`${day.date}T00:00:00Z`),
                  )}
                  aria-pressed={day.date === date}
                  aria-current={day.date === today ? "date" : undefined}
                  tabIndex={
                    day.date === (date.startsWith(month) ? date : `${month}-01`)
                      ? 0
                      : -1
                  }
                  onClick={() => choose(day.date)}
                  onKeyDown={(event) => {
                    const offsets: Record<string, number> = {
                      ArrowLeft: -1,
                      ArrowRight: 1,
                      ArrowUp: -7,
                      ArrowDown: 7,
                    };
                    if (!(event.key in offsets)) return;
                    event.preventDefault();
                    const next = new Date(`${day.date}T00:00:00Z`);
                    next.setUTCDate(next.getUTCDate() + offsets[event.key]);
                    const nextDate = next.toISOString().slice(0, 10);
                    if (nextDate < "1900-01-01" || nextDate > "9999-12-31")
                      return;
                    setMonth(nextDate.slice(0, 7));
                    requestAnimationFrame(() =>
                      calendar.current
                        ?.querySelector<HTMLButtonElement>(
                          `[data-date="${nextDate}"]`,
                        )
                        ?.focus(),
                    );
                  }}
                >
                  {day.day}
                </button>
              ) : (
                <span key={`empty-${i}`} aria-hidden="true" />
              ),
            )}
          </div>
          <button
            className="admin-calendar-today"
            type="button"
            onClick={() => choose(today)}
          >
            Pilih hari ini
          </button>
        </div>
      )}
    </fieldset>
  );
}
