import { buildRobots } from "@ai-tool-cms/seo";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return buildRobots();
}
