import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/*
 * Keep-warm target for an external pinger (see initial-setup.md). Hitting it
 * wakes both the Vercel function and the Neon compute, which otherwise
 * suspends after ~5 idle minutes and adds its own wake-up to every cold page
 * load. Unauthenticated on purpose (/api is outside the middleware matcher),
 * so it must never return anything but a status.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("health: database unreachable", err);
    return Response.json({ ok: false }, { status: 503 });
  }
}
