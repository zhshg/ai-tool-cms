type CrawlerSourceLike = {
  id: string;
  status: string;
};

type CrawlerRunActionOptions = {
  activeSourceId: string | null;
  canRun: boolean;
};

export function canTriggerCrawlerSource(source: Pick<CrawlerSourceLike, "status">): boolean {
  return source.status === "ENABLED";
}

export function getCrawlerRunActionState(
  source: CrawlerSourceLike,
  options: CrawlerRunActionOptions,
) {
  if (!options.canRun) {
    return {
      disabled: true,
      label: "No access",
    };
  }

  if (!canTriggerCrawlerSource(source)) {
    return {
      disabled: true,
      label: "Unavailable",
    };
  }

  if (options.activeSourceId === source.id) {
    return {
      disabled: true,
      label: "Queueing...",
    };
  }

  return {
    disabled: false,
    label: "Run now",
  };
}
