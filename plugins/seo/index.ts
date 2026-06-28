/** SEO plugin extension point (Commit 096) */
export const seoPlugin = {
  slug: "seo",
  module: "seo",
  hooks: ["beforeSEO", "afterPublish"],
};
