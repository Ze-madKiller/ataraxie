"use client";

import { useState, useTransition } from "react";
import { deleteDocument } from "@/app/admin/actions";

export function DeleteDocumentButton({ documentId }: { documentId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button type="button" className="text-xs text-muted underline hover:text-bad" onClick={() => setConfirming(true)}>
        Supprimer
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2 text-xs">
      {error && <span className="text-bad">{error}</span>}
      <button
        type="button"
        className="font-medium text-bad underline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await deleteDocument(documentId);
            if (res.error) setError(res.error);
          })
        }
      >
        {pending ? "Suppression…" : "Confirmer la suppression"}
      </button>
      <button type="button" className="text-muted underline" onClick={() => setConfirming(false)}>
        Annuler
      </button>
    </span>
  );
}
