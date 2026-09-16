import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const spreadsheetId = "1eLakZ90vwhXaBVtrVx75E3ytBDSompf8EGAcaxfnRPU";
const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

async function main() {
  const saved = await prisma.googleSyncConfig.upsert({
    where: { id: "default" },
    create: { id: "default", spreadsheetId, spreadsheetUrl },
    update: { spreadsheetId, spreadsheetUrl, lastError: null },
  });
  console.log("saved", saved.spreadsheetId);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
