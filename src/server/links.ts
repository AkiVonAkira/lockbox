import { env } from "~/env";

/** The public link for a share. Viewers outside the LAN can only reach the public name. */
export const shareUrl = (id: string) => `${env.LOCKBOX_PUBLIC_URL ?? "https://lockbox.kayzel.com"}/s/${id}`;
