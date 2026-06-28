/**
 * Public API 调用示例
 *
 * 用法：
 *   TOOLCMS_API_KEY=atcms_xxx API_URL=http://localhost:4000 node examples/api/list-tools.mjs
 */
const API_KEY = process.env.TOOLCMS_API_KEY;
const API_URL = process.env.API_URL ?? "http://localhost:4000";

if (!API_KEY) {
  console.error("Set TOOLCMS_API_KEY environment variable");
  process.exit(1);
}

const base = `${API_URL}/v1/api/v1`;

async function main() {
  const res = await fetch(`${base}/tools?page[size]=5`, {
    headers: { "X-Api-Key": API_KEY },
  });

  if (!res.ok) {
    console.error(`HTTP ${res.status}:`, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  console.log("Tools:", JSON.stringify(data, null, 2));

  const searchRes = await fetch(`${base}/search?q=ai`, {
    headers: { "X-Api-Key": API_KEY },
  });
  const searchData = await searchRes.json();
  console.log("\nSearch results:", JSON.stringify(searchData, null, 2));
}

main().catch(console.error);
