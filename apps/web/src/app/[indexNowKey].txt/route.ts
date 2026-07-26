import { env } from "@ai-tool-cms/config";

export const dynamic = "force-dynamic";

function buildExpectedFilename(indexNowKey: string | undefined) {
  const trimmedKey = indexNowKey?.trim();
  if (!trimmedKey) return null;
  return `${trimmedKey}.txt`;
}

function resolveRequestedFilename(request: Request) {
  const pathname = new URL(request.url).pathname;
  return pathname.split("/").filter(Boolean).at(-1) ?? "";
}

export async function GET(request: Request) {
  const requestedFilename = resolveRequestedFilename(request);
  const expectedFilename = buildExpectedFilename(env.INDEXNOW_KEY);

  if (!expectedFilename || requestedFilename !== expectedFilename) {
    return new Response("Not Found", {
      status: 404,
    });
  }

  return new Response(env.INDEXNOW_KEY, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
