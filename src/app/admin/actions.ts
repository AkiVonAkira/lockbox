"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_TTL_DAYS, ShareId } from "~/domain/share";
import { isAdmin, signOut } from "~/server/auth";
import { sharesStore } from "~/server/db";

/** Every action checks the session itself: a server action is a public POST endpoint. */
async function adminShare(id: unknown) {
  if (!(await isAdmin())) throw new Error("Not signed in");
  return ShareId.parse(id);
}

export async function extendShare(id: string) {
  sharesStore().extend(await adminShare(id), DEFAULT_TTL_DAYS);
  revalidatePath("/admin");
}

export async function clearLockout(id: string) {
  sharesStore().clearLockout(await adminShare(id));
  revalidatePath("/admin");
}

export async function rotatePin(id: string) {
  sharesStore().rotatePin(await adminShare(id));
  revalidatePath("/admin");
}

export async function deleteShare(id: string) {
  sharesStore().remove(await adminShare(id));
  revalidatePath("/admin");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/signin?signout" });
}
