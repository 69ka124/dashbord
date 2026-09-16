import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/access";
import { parseYearParam } from "@/lib/year-filter";
import { runGlobalSearch } from "@/lib/global-search";

export async function GET(request: Request) {
  await requireAccess("view");

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const year = parseYearParam(searchParams.get("year"));

  const result = await runGlobalSearch(q, year);
  return NextResponse.json(result);
}
