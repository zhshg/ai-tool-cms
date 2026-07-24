import { PrismaClient, ToolStatus } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw`
    select c.slug, c.name, count(*)::int as tool_count
    from categories c
    left join tool_categories tc on tc.category_id = c.id and tc.deleted_at is null
    left join tools t on t.id = tc.tool_id and t.deleted_at is null and t.status::text = 'PUBLISHED'
    where c.deleted_at is null
      and c.slug <> 'uncategorized'
    group by c.slug, c.name
    order by tool_count desc, c.name asc
  `;

  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
