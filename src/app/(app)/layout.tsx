import { auth } from "@/lib/auth";
import { canEdit, getAccess, isOwner } from "@/lib/access";
import { AppNav } from "@/components/app-nav";
import { HashAnchorFlash } from "@/components/hash-anchor-flash";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, access] = await Promise.all([auth(), getAccess()]);
  const editable = access ? canEdit(access) : false;
  const owner = access ? isOwner(access) : false;

  return (
    <div className="min-h-full bg-[var(--bg)] text-[var(--ink)]">
      <AppNav
        email={
          session?.user?.email ??
          (access?.kind === "guest" ? access.email : access?.kind === "owner" ? access.email : null)
        }
        canEdit={editable}
        isOwner={owner}
      />
      <main className="mx-auto w-full max-w-[1600px] px-3 py-5 sm:px-4">
        <HashAnchorFlash />
        {children}
      </main>
    </div>
  );
}

export const dynamic = "force-dynamic";

