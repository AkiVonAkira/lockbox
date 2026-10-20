import { auth } from "~/server/auth";
import { signOutAction } from "../admin/actions";
import { returnPath } from "~/server/auth/hosts";

export const dynamic = "force-dynamic";

/** Auth.js's `error` codes, for the page's one line. Anything else gets the generic line. */
const ERRORS: Record<string, string> = {
  AccessDenied: "Only the Admin group can use Lockbox's admin page.",
  Configuration: "Sign-in is not set up on this server.",
  Verification: "That sign-in link has expired.",
};

/**
 * After a failed sign-in, and for sign-out. A signed-out visit to the admin page goes straight to
 * Authentik. `?signout` asks before signing out, or says the browser is signed out and waits.
 */
export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; signout?: string }>;
}) {
  const { callbackUrl, error, signout } = await searchParams;
  const signedIn = signout !== undefined && Boolean((await auth())?.user);
  const start = `/signin/authentik?${new URLSearchParams({ callbackUrl: returnPath(callbackUrl) })}`;

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="glass flex w-full max-w-[320px] flex-col items-center gap-5 px-7 pt-8 pb-7 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" width={44} height={44} />
        <h1 className="text-[19px] font-semibold">
          {signout === undefined ? "Lockbox admin" : signedIn ? "Sign out of Lockbox?" : "You're signed out"}
        </h1>
        {error && (
          <p role="alert" className="notice w-full">
            {ERRORS[error] ?? "Sign-in did not finish. Try again."}
          </p>
        )}
        {signedIn ? (
          <form action={signOutAction} className="flex w-full flex-col gap-2">
            <button type="submit" className="btn btn-pri w-full py-2 text-[13px]">
              Sign out
            </button>
          </form>
        ) : (
          <a href={start} className="btn btn-pri w-full py-2 text-center text-[13px]">
            {signout === undefined ? "Sign in with Authentik" : "Sign in again"}
          </a>
        )}
      </div>
    </main>
  );
}
