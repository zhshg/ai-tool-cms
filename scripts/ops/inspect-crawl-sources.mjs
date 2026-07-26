import { PrismaClient } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

try {
  const columns = await prisma.$queryRawUnsafe(
    "select column_name, data_type from information_schema.columns where table_name = 'crawl_sources' order by ordinal_position",
  );
  console.log("COLUMNS");
  console.log(JSON.stringify(columns, null, 2));

  const tables = await prisma.$queryRawUnsafe(
    "select table_name from information_schema.tables where table_schema = 'public' and table_name like 'crawl_%' order by table_name",
  );
  console.log("TABLES");
  console.log(JSON.stringify(tables, null, 2));

  const count = await prisma.crawlSource.count();
  console.log(`COUNT=${count}`);

  const rows = await prisma.crawlSource.findMany({ take: 5 });
  console.log("ROWS");
  console.log(JSON.stringify(rows, null, 2));
} finally {
  await prisma.$disconnect();
}
