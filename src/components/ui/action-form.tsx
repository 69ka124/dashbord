"use client";

import { useRouter } from "next/navigation";
import { useTransition, type FormEvent, type ReactNode } from "react";
import { runWithToast } from "@/lib/action-feedback";

export function ActionForm({
  action,
  successMessage,
  confirmMessage,
  className,
  id,
  children,
  onSuccess,
}: {
  action: (formData: FormData) => Promise<void>;
  successMessage: string;
  confirmMessage?: string;
  className?: string;
  id?: string;
  children: ReactNode;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      await runWithToast(
        async () => {
          await action(formData);
          router.refresh();
          onSuccess?.();
        },
        {
          loading: "Сохранение…",
          success: successMessage,
          error: "Не удалось выполнить операцию",
        },
      );
    });
  }

  return (
    <form id={id} className={className} onSubmit={handleSubmit}>
      {children}
    </form>
  );
}
