import { GoogleSyncError } from "@/lib/google/auth-client";

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((item) => item.some((cell) => cell.trim()));
}

function looksPrivate(text: string, url: string) {
  return (
    url.includes("accounts.google.com") ||
    /<html/i.test(text) ||
    text.includes("ServiceLogin") ||
    text.includes("google-signin")
  );
}

export async function fetchPublicSheetCsv(
  spreadsheetId: string,
  sheetTitle: string,
): Promise<{ headers: string[]; rows: unknown[][] }> {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`);
  url.searchParams.set("tqx", "out:csv");
  url.searchParams.set("sheet", sheetTitle);

  const response = await fetch(url.toString(), {
    redirect: "follow",
    headers: { Accept: "text/csv,text/plain;q=0.9,*/*;q=0.1" },
  });
  const text = await response.text();

  if (looksPrivate(text, response.url)) {
    throw new GoogleSyncError(
      "API_ERROR",
      "Таблица закрыта. Откройте доступ «все, у кого есть ссылка» (просмотр).",
    );
  }

  if (!response.ok) {
    return { headers: [], rows: [] };
  }

  const [headerRow, ...rows] = parseCsv(text);
  return {
    headers: headerRow?.map((value) => value.trim()) ?? [],
    rows,
  };
}
