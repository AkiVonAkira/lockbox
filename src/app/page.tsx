import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isPublic, requestOrigin } from "~/server/auth/hosts";

export const dynamic = "force-dynamic";

/** On the admin URL, the admin page. On the public URL, one line: a share opens from its own link. */
export default async function Home() {
  const origin = requestOrigin(await headers(), process.env.NODE_ENV === "development");
  if (origin && !isPublic(origin)) redirect("/admin");
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" width={44} height={44} />
        <h1 className="text-[19px] font-semibold">Lockbox</h1>
        <p className="text-muted-foreground text-[12.5px]">Open a share from the link you were sent.</p>
      </div>
    </main>
  );
}
