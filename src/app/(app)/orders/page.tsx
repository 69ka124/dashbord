import { redirect } from "next/navigation";

export default function OrdersRemovedRedirect() {
  redirect("/works?module=production");
}
