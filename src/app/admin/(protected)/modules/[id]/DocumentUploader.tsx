"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createUploadUrl, registerDocument } from "@/app/admin/actions";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { DocumentKind } from "@/lib/types";

type FileStatus = { name: string; state: "waiting" | "uploading" | "done" | "error"; error?: string };

export function DocumentUploader({ moduleId }: { moduleId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<DocumentKind>("exam");
  const [year, setYear] = useState("");
  const [session, setSession] = useState("Normale");
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const busy = files.some((f) => f.state === "waiting" || f.state === "uploading");

  const update = (i: number, patch: Partial<FileStatus>) =>
    setFiles((prev) => prev.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  async function upload(list: File[]) {
    const pdfs = list.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length === 0) return;
    const offset = files.length;
    setFiles((prev) => [...prev, ...pdfs.map((f) => ({ name: f.name, state: "waiting" as const }))]);

    const supabase = createBrowserSupabase();
    const examYear = /^\d{4}$/.test(year.trim()) ? Number(year.trim()) : null;
    const withExamInfo = kind !== "cours";

    // Sequential: keeps memory low and the order of lessons stable.
    for (const [k, file] of pdfs.entries()) {
      const i = offset + k;
      update(i, { state: "uploading" });
      try {
        const { path, token } = await createUploadUrl(moduleId, file.name);
        const { error } = await supabase.storage
          .from("documents")
          .uploadToSignedUrl(path, token, file, { contentType: "application/pdf" });
        if (error) throw new Error(error.message);
        const res = await registerDocument({
          moduleId,
          kind,
          title: file.name.replace(/\.pdf$/i, ""),
          path,
          examYear: withExamInfo ? examYear : null,
          examSession: withExamInfo ? session || null : null,
        });
        if (res.error) throw new Error(res.error);
        update(i, { state: "done" });
      } catch (err) {
        update(i, { state: "error", error: err instanceof Error ? err.message : String(err) });
      }
    }
    router.refresh();
  }

  return (
    <section className="card space-y-4 p-5">
      <h2 className="font-semibold">Déposer des PDF</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Type</span>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
            <option value="exam">Examen</option>
            <option value="cours">Cours</option>
            <option value="corrige">Corrigé</option>
          </select>
        </label>
        {kind !== "cours" && (
          <>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Année</span>
              <input
                className="input"
                inputMode="numeric"
                placeholder="ex. 2024"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Session</span>
              <select className="input" value={session} onChange={(e) => setSession(e.target.value)}>
                <option value="Normale">Normale</option>
                <option value="Rattrapage">Rattrapage</option>
                <option value="">Non précisée</option>
              </select>
            </label>
          </>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) upload([...e.dataTransfer.files]);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center text-sm transition ${
          dragging ? "border-accent bg-accent-soft" : "border-line hover:border-accent"
        }`}
      >
        <p className="font-medium">Glissez vos PDF ici</p>
        <p className="text-muted">ou cliquez pour choisir · plusieurs fichiers possibles</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) upload([...e.target.files]);
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="space-y-1 text-sm">
          {files.map((f, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span className="truncate">{f.name}</span>
              <span
                className={
                  f.state === "done" ? "text-good" : f.state === "error" ? "text-bad" : "text-muted"
                }
              >
                {f.state === "waiting" && "En attente"}
                {f.state === "uploading" && "Envoi…"}
                {f.state === "done" && "Envoyé"}
                {f.state === "error" && (f.error ?? "Erreur")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
