import { linkOrigin } from "~/server/auth/hosts";

/** The public link for a share, on LOCKBOX_PUBLIC_URL. */
export const shareUrl = (id: string) => `${linkOrigin()}/s/${id}`;
