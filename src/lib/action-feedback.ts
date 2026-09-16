import { toast } from "sonner";

export async function runWithToast<T>(
  fn: () => Promise<T>,
  messages: { loading?: string; success: string; error?: string },
): Promise<T | undefined> {
  const id = messages.loading ? toast.loading(messages.loading) : undefined;
  try {
    const result = await fn();
    if (id) toast.dismiss(id);
    toast.success(messages.success);
    return result;
  } catch {
    if (id) toast.dismiss(id);
    toast.error(messages.error ?? "Не удалось выполнить операцию");
    return undefined;
  }
}
