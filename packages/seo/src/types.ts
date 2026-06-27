export type BreadcrumbItem = {
  name: string;
  path: string;
};

export type SeoPageInput = {
  title?: string;
  description?: string;
  path?: string;
  canonical?: string;
  noIndex?: boolean;
  ogImage?: string;
  ogType?: "website" | "article";
  twitterCard?: "summary" | "summary_large_image";
};

export type SoftwareApplicationInput = {
  name: string;
  description?: string;
  url: string;
  applicationCategory?: string;
  operatingSystem?: string;
  image?: string;
  offers?: {
    price: string;
    priceCurrency: string;
  };
};

export type SitemapEntry = {
  url: string;
  lastModified?: Date | string;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

export type RobotsOptions = {
  allow?: string | string[];
  disallow?: string | string[];
  noIndex?: boolean;
};
