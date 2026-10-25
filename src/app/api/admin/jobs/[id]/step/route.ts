import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { runImportStep } from "@/lib/import/run-step";

// One chunk = one Claude call with the module's lessons attached; allow it time to think.
export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const job = await runImportStep(id);
    return NextResponse.json({ job });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
