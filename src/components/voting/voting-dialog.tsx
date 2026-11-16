"use client";
import { useEffect, useId, useRef } from "react";

export function VotingDialog({
  title,
  busy = false,
  onClose,
  children,
  className = "",
}: {
  title: string;
  busy?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => {
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const node = dialog.current;
    node?.showModal();
    heading.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      node?.close();
      document.body.style.overflow = previous;
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      className={`voting-dialog ${className}`}
      ref={dialog}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="voting-dialog-heading">
        <h2 ref={heading} tabIndex={-1} id={id}>
          {title}
        </h2>
        <button
          className="voting-secondary"
          type="button"
          disabled={busy}
          onClick={onClose}
        >
          Tutup
        </button>
      </div>
      {children}
    </dialog>
  );
}
