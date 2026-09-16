"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      className="nav-chip"
      onClick={async () => {
        await signOut({ callbackUrl: "/login" });
      }}
    >
      Выйти
    </button>
  );
}
