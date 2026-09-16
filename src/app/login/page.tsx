import { SignInForm } from "@/components/sign-in-form";
import { auth } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [session, access, params] = await Promise.all([
    auth(),
    getAccess(),
    searchParams,
  ]);

  if (process.env.OPEN_ACCESS === "true" || session?.user || access) {
    redirect("/");
  }

  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
  const ownerEmail = process.env.OWNER_EMAIL ?? "";

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-md panel">
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
          Учёт работ
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Вход по email. Доступ выдаёт владелец в разделе «Доступ».
        </p>
        {params.error === "access" ? (
          <p className="mt-3 rounded-md border border-[var(--negative)]/30 bg-red-50 px-3 py-2 text-sm text-[var(--negative)]">
            Доступ отозван или срок действия истёк.
          </p>
        ) : null}
        <div className="mt-6">
          <SignInForm googleEnabled={googleEnabled} ownerEmail={ownerEmail} />
        </div>
      </div>
    </div>
  );
}
