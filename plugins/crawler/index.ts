/** Crawler plugin extension point (Commit 096) */
export const crawlerPlugin = {
  slug: "crawler",
  module: "crawler",
  hooks: ["onCrawlerFinished"],
};
