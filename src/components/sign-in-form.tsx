"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function SignInForm({
  googleEnabled,
  ownerEmail,
}: {
  googleEnabled: boolean;
  ownerEmail: string;
}) {
  const [email, setEmail] = useState(ownerEmail);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await signIn("email-login", {
      email,
      redirect: false,
      callbackUrl: "/",
    });
    setPending(false);
    if (res?.error) {
      setError("Нет доступа для этого email. Попросите владельца добавить вас в разделе «Доступ».");
      return;
    }
    window.location.href = "/";
  }

  return (
    <div className="space-y-4">
      {googleEnabled ? (
        <button
          type="button"
          className="btn w-full"
          onClick={() => signIn("google", { callbackUrl: "/" })}
        >
          Войти через Google
        </button>
      ) : null}

      <form onSubmit={onEmailLogin} className="space-y-3">
        {googleEnabled ? (
          <p className="text-sm text-[var(--muted)]">Или войдите по email:</p>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Введите email, который добавил владелец (или ваш OWNER_EMAIL).
          </p>
        )}
        <input
          className="field"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          autoComplete="email"
        />
        <button className="btn w-full" type="submit" disabled={pending}>
          {pending ? "Входим…" : "Войти по email"}
        </button>
      </form>

      {error ? <p className="text-sm text-[var(--negative)]">{error}</p> : null}
    </div>
  );
}
