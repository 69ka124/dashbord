import { prisma } from "@/lib/prisma";

export type ShareRole = "view" | "edit";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function listAccessGrants() {
  return prisma.accessGrant.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createAccessGrant(input: {
  email: string;
  role: ShareRole;
  label?: string;
  expiresAt?: Date | null;
}) {
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) {
    throw new Error("Укажите корректный email");
  }

  const owner = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
  if (owner && email === owner) {
    throw new Error("Владелец уже имеет полный доступ через OWNER_EMAIL");
  }

  return prisma.accessGrant.upsert({
    where: { email },
    create: {
      email,
      role: input.role,
      label: input.label?.trim() || null,
      expiresAt: input.expiresAt ?? null,
      revokedAt: null,
    },
    update: {
      role: input.role,
      label: input.label?.trim() || null,
      expiresAt: input.expiresAt ?? null,
      revokedAt: null,
    },
  });
}

export async function revokeAccessGrant(id: string) {
  return prisma.accessGrant.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

export async function findValidAccessGrant(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const grant = await prisma.accessGrant.findUnique({
    where: { email: normalized },
  });
  if (!grant) return null;
  if (grant.revokedAt) return null;
  if (grant.expiresAt && grant.expiresAt.getTime() < Date.now()) return null;
  return grant;
}

export async function isAllowedEmail(email: string) {
  const normalized = normalizeEmail(email);
  const owner = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
  if (owner && normalized === owner) return true;
  const grant = await findValidAccessGrant(normalized);
  return Boolean(grant);
}
