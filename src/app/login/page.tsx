import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  // Belt-and-braces: only redirect to /today when the session actually
  // has a user id — otherwise we can loop with middleware (which sees a
  // valid cookie) if session.user.id somehow isn't populated.
  if (session?.user?.id) redirect("/today");

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
      <LoginForm />
    </div>
  );
}
