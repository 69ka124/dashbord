import { redirect } from "next/navigation";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams({ paymentStatus: "оплачено" });
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "paymentStatus") query.set(key, value);
  }
  redirect(`/expenses?${query.toString()}`);
}
