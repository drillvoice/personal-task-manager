import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

/**
 * Auth.js redirects failed sign-ins here with ?error=<code>. AccessDenied
 * means the signIn callback returned false — for us, that's the
 * ALLOWED_EMAIL gate rejecting a GitHub account whose primary email doesn't
 * match.
 */
function messageForError(code: string | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "AccessDenied":
      return "That GitHub account isn't allowed to sign in here.";
    case "OAuthAccountNotLinked":
      return "This GitHub account is linked to a different email than expected.";
    case "Configuration":
      return "Server auth configuration is missing an env var.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.id) redirect("/today");
  const params = await searchParams;
  const errorMessage = messageForError(params.error);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold">Task Manager</h1>
        <p
          className="font-mono mt-2 text-[11px]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          A daily-use tool. Sign in with your GitHub account.
        </p>
      </div>
      <LoginForm error={errorMessage} />
    </div>
  );
}
