"use client";

import { useId, useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react/dist/ssr";

export function VotingPinField({
  label,
  name,
  value,
  onChange,
  minLength,
  maxLength = 200,
  autoComplete = "off",
  helperText,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
  maxLength?: number;
  autoComplete?: string;
  helperText?: string;
}) {
  const inputId = useId();
  const helpId = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={inputId}>{label}</label>
      <div className="admin-pin-input-wrap">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          minLength={minLength}
          maxLength={maxLength}
          autoComplete={autoComplete}
          aria-describedby={helperText ? helpId : undefined}
        />
        <button
          type="button"
          className="admin-pin-toggle"
          aria-pressed={visible}
          aria-label={visible ? `Sembunyikan ${label}` : `Tampilkan ${label}`}
          onClick={() => setVisible((prev) => !prev)}
        >
          {visible ? (
            <EyeSlash size={20} aria-hidden="true" />
          ) : (
            <Eye size={20} aria-hidden="true" />
          )}
        </button>
      </div>
      {helperText && <small id={helpId}>{helperText}</small>}
    </div>
  );
}
