"use server";

import { signIn } from "@/lib/auth";

export async function signInWithGitHub(): Promise<void> {
  await signIn("github", { redirectTo: "/today" });
}
