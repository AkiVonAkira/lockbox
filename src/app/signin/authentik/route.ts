import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { signIn } from "~/server/auth";
import { signInEnabled } from "~/server/auth/config";
import { returnPath } from "~/server/auth/hosts";

export const dynamic = "force-dynamic";

/** Starts Authentik sign-in at once, so a signed-out visit to the admin page never stops on a page of ours. */
export async function GET(request: NextRequest) {
  if (!signInEnabled) redirect("/signin?error=Configuration");
  await signIn("authentik", { redirectTo: returnPath(request.nextUrl.searchParams.get("callbackUrl")) });
}
