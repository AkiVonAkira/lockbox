import { ArrowLeft } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ShareId } from "~/domain/share";
import { isAdmin } from "~/server/auth";
import { sharesStore } from "~/server/db";
import { Viewer } from "../../../_components/viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Preview · Lockbox" };

/** An admin's look at a share without its PIN. It does not count as a view. */
export default async function AdminView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isAdmin())) redirect(`/signin/authentik?callbackUrl=/admin/view/${encodeURIComponent(id)}`);
  const parsed = ShareId.safeParse(id);
  const share = parsed.success ? sharesStore().peek(parsed.data) : null;
  if (!share) notFound();
  return (
    <Viewer
      title={share.title}
      items={share.items}
      back={
        <Link href="/admin" className="title-link text-muted-foreground inline-flex w-fit items-center gap-1 text-[12.5px]">
          <ArrowLeft size={13} aria-hidden />
          Shares · admin preview, not counted as a view
        </Link>
      }
    />
  );
}
