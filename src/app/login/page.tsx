import { redirect } from "next/navigation";
import { signIn, auth } from "@/lib/auth";

async function submit(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").trim();
  if (!email) return;
  await signIn("resend", { email, redirectTo: "/today" });
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/today");
  const params = await searchParams;
  const verifying = params.verify === "1";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold">Task Manager</h1>
        <p
          className="font-mono mt-2 text-[11px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          A daily-use tool. Sign in with a magic link.
        </p>
      </div>

      {verifying ? (
        <div
          className="rounded-md border p-6 text-center"
          style={{
            background: "var(--color-paper-raised)",
            borderColor: "var(--color-line)",
          }}
        >
          <p className="text-[14px] font-medium">Check your email.</p>
          <p
            className="font-mono mt-2 text-[11px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            We&rsquo;ve sent a magic link. It expires in 24 hours.
          </p>
        </div>
      ) : (
        <form action={submit} className="w-full flex flex-col gap-2">
          <input
            name="email"
            type="email"
            required
            autoFocus
            placeholder="you@example.com"
            className="w-full border p-3 text-[13px] outline-none"
            style={{
              background: "transparent",
              borderColor: "var(--color-line)",
              color: "var(--color-ink)",
            }}
          />
          <button
            type="submit"
            className="font-mono w-full px-3 py-3 text-[12px] font-semibold"
            style={{
              background: "var(--color-ink)",
              color: "var(--color-paper)",
            }}
          >
            Send magic link
          </button>
        </form>
      )}
    </div>
  );
}
