import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { findValidAccessGrant, type ShareRole } from "@/modules/sharing/service";

export type AccessContext =
  | { kind: "owner"; userId: string; email: string }
  | { kind: "guest"; role: ShareRole; email: string; grantId: string };

const OPEN_OWNER: AccessContext = {
  kind: "owner",
  userId: "open-access",
  email: "demo@open",
};

export function isOpenAccessEnabled(): boolean {
  return process.env.OPEN_ACCESS === "true";
}

function isOwnerEmail(email: string | null | undefined): boolean {
  const owner = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
  return Boolean(owner && email?.trim().toLowerCase() === owner);
}

export async function getAccess(): Promise<AccessContext | null> {
  if (isOpenAccessEnabled()) {
    return OPEN_OWNER;
  }

  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email || !session?.user) {
    return null;
  }

  if (isOwnerEmail(email)) {
    return {
      kind: "owner",
      userId: session.user.id,
      email,
    };
  }

  const grant = await findValidAccessGrant(email);
  if (grant) {
    return {
      kind: "guest",
      role: grant.role as ShareRole,
      email,
      grantId: grant.id,
    };
  }

  return null;
}

export async function requireAccess(
  min: "view" | "edit" | "owner" = "view",
): Promise<AccessContext> {
  const access = await getAccess();
  if (!access) {
    redirect("/login");
  }

  if (min === "owner" && access.kind !== "owner") {
    redirect("/");
  }

  if (min === "edit") {
    if (access.kind === "guest" && access.role === "view") {
      redirect("/");
    }
  }

  return access;
}

export function canEdit(access: AccessContext): boolean {
  return access.kind === "owner" || access.role === "edit";
}

export function isOwner(access: AccessContext): boolean {
  return access.kind === "owner";
}
