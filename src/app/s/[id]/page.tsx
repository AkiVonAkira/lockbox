import { type Metadata } from "next";

import { Unlock } from "../../_components/unlock";

export const dynamic = "force-dynamic";

// The same title for every share, so a link preview in a chat says nothing about what is inside.
export const metadata: Metadata = { title: "Locked · Lockbox", robots: { index: false, follow: false } };

/** The PIN page. It looks the same for every id, real or not, and holds nothing of the share. */
export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  return <Unlock id={(await params).id} />;
}
