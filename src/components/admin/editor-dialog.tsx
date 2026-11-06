"use client";

import { useEffect, useId, useRef } from "react";

export function EditorDialog({
  title,
  busy,
  onClose,
  children,
}: {
  title: string;
  busy: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();

  useEffect(() => {
    const node = dialog.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    node?.showModal();
    heading.current?.focus();
    return () => {
      node?.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="admin-editor-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="admin-dialog-header">
        <h2 id={titleId} ref={heading} tabIndex={-1}>
          {title}
        </h2>
        <button
          className="admin-button"
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
