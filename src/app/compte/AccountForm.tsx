"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateProfile } from "@/app/actions";
import { SEMESTERS, semesterLabel } from "@/lib/semesters";

export function AccountForm({ fullName, semester }: { fullName: string; semester: number | null }) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [sem, setSem] = useState(semester ? String(semester) : "");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await updateProfile({ fullName: name, semester: sem });
          if (res.error) setMessage({ kind: "error", text: res.error });
          else {
            setMessage({ kind: "ok", text: "Enregistré." });
            router.refresh();
          }
        });
      }}
    >
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Nom complet</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Semestre actuel</span>
        <select className="input" value={sem} onChange={(e) => setSem(e.target.value)} required>
          <option value="" disabled>
            Choisir…
          </option>
          {SEMESTERS.map((s) => (
            <option key={s} value={s}>
              {semesterLabel(s)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {message && (
          <span className={`text-sm ${message.kind === "error" ? "text-bad" : "text-good"}`}>{message.text}</span>
        )}
      </div>
    </form>
  );
}
