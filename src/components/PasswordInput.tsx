"use client";

import { useId, useState } from "react";

/**
 * Labelled password field with a show/hide toggle. Renders its own <label> so the toggle button
 * sits outside it and never becomes part of the field's accessible name.
 */
export function PasswordInput({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "id">) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mb-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      <div className="relative">
        <input
          {...props}
          id={id}
          type={visible ? "text" : "password"}
          aria-describedby={[hint && `${id}-hint`, props["aria-describedby"]].filter(Boolean).join(" ") || undefined}
          className="input pr-24"
        />
        <button
          type="button"
          className="btn btn-quiet absolute inset-y-0 right-0 min-h-0 px-3 text-sm"
          aria-controls={id}
          aria-label="Afficher le mot de passe"
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          <span aria-hidden>{visible ? "Masquer" : "Afficher"}</span>
        </button>
      </div>
    </div>
  );
}
