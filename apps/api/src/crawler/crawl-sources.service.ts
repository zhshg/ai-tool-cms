import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { CrawlSourceStatus, Prisma } from "@ai-tool-cms/database";
import {
  computeNextRunAt,
  createCrawlerContext,
  createCrawlResponse,
  globalAdapterRegistry,
  type CrawlCategoryDTO,
  type CrawlToolListItemDTO,
  type CrawlerContext,
  StructuredSiteAdapter,
} from "@ai-tool-cms/crawler-core";
import { slugify } from "@ai-tool-cms/common";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";
import { paginate, type PaginationQueryDto } from "../common/dto/pagination.dto";
import type {
  CreateCrawlFieldDefineDto,
  CreateCrawlRuleDto,
  CreateCrawlSourceDto,
  CrawlRecordsQueryDto,
  UpdateCrawlFrequencyDto,
  UpdateCrawlFieldDefineDto,
  UpdateCrawlRuleDto,
  UpdateCrawlSourceDto,
  PreviewCrawlStepDto,
  RunCrawlRuleDto,
} from "./dto/crawl-source.dto";

const execFileAsync = promisify(execFile);

@Injectable()
export class CrawlSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationQueryDto) {
    const { skip, take } = paginate(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.client.crawlSource.findMany({
        where: activeOnly,
        orderBy: [{ priority: "desc" }, { name: "asc" }],
        skip,
        take,
        include: {
          _count: {
            select: {
              rules: true,
              fieldDefines: true,
              records: true,
              jobs: true,
            },
          },
        },
      }),
      this.prisma.client.crawlSource.count({ where: activeOnly }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: string) {
    const source = await this.prisma.client.crawlSource.findFirst({
      where: { id, ...activeOnly },
    });
    if (!source) throw new NotFoundException("Crawl source not found");
    return source;
  }

  async create(dto: CreateCrawlSourceDto, actorId: string) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    const schedule = dto.schedule ?? "DAILY";
    const crawlIntervalMinutes = dto.crawlIntervalMinutes ?? 1440;
    const status = dto.status ?? "ENABLED";

    try {
      await this.ensureSlugAvailable(slug);

      return await this.prisma.client.crawlSource.create({
        data: {
          slug,
          name: dto.name,
          kind: dto.kind ?? "CUSTOM",
          baseUrl: dto.baseUrl,
          adapterType: dto.adapterType,
          status,
          schedule,
          crawlIntervalMinutes,
          robotsTxt: dto.robotsTxt,
          priority: dto.priority ?? 100,
          isEnabled: status === "ENABLED",
          nextRunAt: computeNextRunAt(schedule, crawlIntervalMinutes),
          config: (dto.config ?? {}) as Prisma.InputJsonValue,
          metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
          createdById: actorId,
        },
      });
    } catch (error) {
      throw new ConflictException(
        error instanceof Error ? error.message : "Failed to create crawl source",
      );
    }
  }

  async update(id: string, dto: UpdateCrawlSourceDto, actorId: string) {
    const current = await this.findById(id);
    const schedule = dto.schedule ?? current.schedule;
    const crawlIntervalMinutes = dto.crawlIntervalMinutes ?? current.crawlIntervalMinutes;
    const status = dto.status ?? current.status;
    const nextSlug = dto.slug ? slugify(dto.slug) : current.slug;

    if (dto.slug) {
      await this.ensureSlugAvailable(nextSlug, id);
    }

    return this.prisma.client.crawlSource.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug ? nextSlug : undefined,
        kind: dto.kind ?? current.kind,
        baseUrl: dto.baseUrl,
        adapterType: dto.adapterType,
        status,
        schedule,
        crawlIntervalMinutes,
        robotsTxt: dto.robotsTxt,
        priority: dto.priority,
        isEnabled: dto.isEnabled ?? status === "ENABLED",
        nextRunAt:
          status === "ENABLED"
            ? computeNextRunAt(schedule, crawlIntervalMinutes)
            : current.nextRunAt,
        config: dto.config as Prisma.InputJsonValue | undefined,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        updatedById: actorId,
      },
    });
  }

  async setStatus(id: string, status: CrawlSourceStatus, actorId: string) {
    const current = await this.findById(id);
    const nextRunAt =
      status === "ENABLED"
        ? computeNextRunAt(current.schedule, current.crawlIntervalMinutes)
        : null;

    return this.prisma.client.crawlSource.update({
      where: { id },
      data: {
        status,
        isEnabled: status === "ENABLED",
        nextRunAt,
        updatedById: actorId,
      },
    });
  }

  async updateFrequency(id: string, dto: UpdateCrawlFrequencyDto, actorId: string) {
    const current = await this.findById(id);
    const nextRunAt =
      current.status === "ENABLED"
        ? computeNextRunAt(dto.schedule, dto.crawlIntervalMinutes)
        : current.nextRunAt;

    return this.prisma.client.crawlSource.update({
      where: { id },
      data: {
        schedule: dto.schedule,
        crawlIntervalMinutes: dto.crawlIntervalMinutes,
        nextRunAt,
        updatedById: actorId,
      },
    });
  }

  async markRunComplete(id: string, finishedAt: Date = new Date()) {
    const source = await this.findById(id);
    return this.prisma.client.crawlSource.update({
      where: { id },
      data: {
        lastRunAt: finishedAt,
        nextRunAt: computeNextRunAt(source.schedule, source.crawlIntervalMinutes, finishedAt),
      },
    });
  }

  private async ensureSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.client.crawlSource.findFirst({
      where: {
        slug,
        ...activeOnly,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `Crawl source slug "${slug}" already exists. Please edit the existing source or use a different slug.`,
      );
    }
  }

  async getSourceGraph(id: string) {
    const source = await this.prisma.client.crawlSource.findFirst({
      where: { id, ...activeOnly },
      include: {
        rules: {
          where: { ...activeOnly },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          include: {
            fields: {
              where: { ...activeOnly },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            },
            _count: {
              select: { records: true, fields: true },
            },
          },
        },
        records: {
          where: { ...activeOnly },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: {
          select: {
            rules: true,
            fieldDefines: true,
            records: true,
            jobs: true,
          },
        },
      },
    });

    if (!source) throw new NotFoundException("Crawl source not found");
    return source;
  }

  async listRules(sourceId?: string) {
    return this.prisma.client.crawlRule.findMany({
      where: {
        ...activeOnly,
        ...(sourceId ? { sourceId } : {}),
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: {
        fields: {
          where: { ...activeOnly },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        _count: {
          select: { records: true, fields: true },
        },
      },
    });
  }

  async findRuleById(id: string) {
    const rule = await this.prisma.client.crawlRule.findFirst({
      where: { id, ...activeOnly },
      include: {
        source: true,
        fields: {
          where: { ...activeOnly },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        _count: {
          select: { records: true, fields: true },
        },
      },
    });

    if (!rule) throw new NotFoundException("Crawl rule not found");
    return rule;
  }

  async createRule(sourceId: string, dto: CreateCrawlRuleDto, actorId: string) {
    await this.findById(sourceId);
    return this.prisma.client.crawlRule.create({
      data: {
        sourceId,
        ruleType: dto.ruleType,
        name: dto.name,
        code: slugify(dto.code),
        isEnabled: dto.isEnabled ?? true,
        priority: dto.priority ?? 100,
        listConfig: (dto.listConfig ?? {}) as Prisma.InputJsonValue,
        detailConfig: (dto.detailConfig ?? {}) as Prisma.InputJsonValue,
        parseConfig: (dto.parseConfig ?? {}) as Prisma.InputJsonValue,
        requestConfig: (dto.requestConfig ?? {}) as Prisma.InputJsonValue,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        createdById: actorId,
      },
    });
  }

  async updateRule(id: string, dto: UpdateCrawlRuleDto, actorId: string) {
    await this.findRuleById(id);
    return this.prisma.client.crawlRule.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code ? slugify(dto.code) : undefined,
        ruleType: dto.ruleType,
        isEnabled: dto.isEnabled,
        priority: dto.priority,
        listConfig: dto.listConfig as Prisma.InputJsonValue | undefined,
        detailConfig: dto.detailConfig as Prisma.InputJsonValue | undefined,
        parseConfig: dto.parseConfig as Prisma.InputJsonValue | undefined,
        requestConfig: dto.requestConfig as Prisma.InputJsonValue | undefined,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        updatedById: actorId,
      },
    });
  }

  async deleteRule(id: string, actorId: string) {
    await this.findRuleById(id);
    return this.prisma.client.crawlRule.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: actorId,
      },
    });
  }

  async runRule(id: string, dto: RunCrawlRuleDto, actorId: string) {
    const rule = await this.findRuleById(id);
    const source = await this.findById(rule.sourceId);
    const sourceKey = this.resolveAutoUpdateSourceKey(source, rule);
    const limit = dto.limit ?? 10;
    const dedupeExisting = dto.dedupeExisting ?? true;
    const commandArgs = [
      "--filter",
      "@ai-tool-cms/auto-update",
      "crawler:run",
      "--source",
      sourceKey,
      "--limit",
      String(limit),
      "--dry-run",
    ];

    const { stdout, stderr } = await execFileAsync("pnpm", commandArgs, {
      cwd: this.getWorkspaceRoot(),
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
      env: process.env,
    });

    return {
      rule: {
        id: rule.id,
        name: rule.name,
        code: rule.code,
      },
      source: {
        id: source.id,
        name: source.name,
        adapterType: source.adapterType,
      },
      limit,
      dedupeExisting,
      command: `pnpm ${commandArgs.join(" ")}`,
      output: [stdout, stderr].filter(Boolean).join("\n").trim(),
      artifacts: this.extractArtifactPaths([stdout, stderr].filter(Boolean).join("\n")),
      executedById: actorId,
      executedAt: new Date().toISOString(),
    };
  }

  async listFields(sourceId?: string, ruleId?: string) {
    return this.prisma.client.crawlFieldDefine.findMany({
      where: {
        ...activeOnly,
        ...(sourceId ? { sourceId } : {}),
        ...(ruleId ? { ruleId } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        source: true,
        rule: true,
      },
    });
  }

  async findFieldById(id: string) {
    const field = await this.prisma.client.crawlFieldDefine.findFirst({
      where: { id, ...activeOnly },
      include: {
        source: true,
        rule: true,
      },
    });

    if (!field) throw new NotFoundException("Crawl field not found");
    return field;
  }

  async createField(ruleId: string, dto: CreateCrawlFieldDefineDto, actorId: string) {
    const rule = await this.findRuleById(ruleId);
    return this.prisma.client.crawlFieldDefine.create({
      data: {
        sourceId: rule.sourceId,
        ruleId,
        fieldKey: dto.fieldKey,
        label: dto.label,
        fieldType: dto.fieldType,
        sourcePath: dto.sourcePath,
        transform: dto.transform,
        defaultValue: dto.defaultValue,
        isRequired: dto.isRequired ?? false,
        isArray: dto.isArray ?? false,
        sortOrder: dto.sortOrder ?? 0,
        config: (dto.config ?? {}) as Prisma.InputJsonValue,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        createdById: actorId,
      },
    });
  }

  async updateField(id: string, dto: UpdateCrawlFieldDefineDto, actorId: string) {
    await this.findFieldById(id);
    return this.prisma.client.crawlFieldDefine.update({
      where: { id },
      data: {
        fieldKey: dto.fieldKey,
        label: dto.label,
        fieldType: dto.fieldType,
        sourcePath: dto.sourcePath,
        transform: dto.transform,
        defaultValue: dto.defaultValue,
        isRequired: dto.isRequired,
        isArray: dto.isArray,
        sortOrder: dto.sortOrder,
        config: dto.config as Prisma.InputJsonValue | undefined,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        updatedById: actorId,
      },
    });
  }

  async listRecords(query: CrawlRecordsQueryDto & PaginationQueryDto) {
    const { skip, take } = paginate(query.page, query.pageSize);
    const where = {
      ...activeOnly,
      ...(query.sourceId ? { sourceId: query.sourceId } : {}),
      ...(query.ruleId ? { ruleId: query.ruleId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.crawlRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          source: true,
          rule: true,
          crawlJob: true,
          publishedTool: true,
        },
      }),
      this.prisma.client.crawlRecord.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async listArtifacts(source?: string, pageSize = 20) {
    const dir = path.join(this.getWorkspaceRoot(), "storage", "auto-update", "candidates");
    try {
      await fs.access(dir);
    } catch {
      return { items: [], total: 0 };
    }
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const items = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .filter((entry) => !source || entry.name.toLowerCase().includes(source.toLowerCase()))
        .map(async (entry) => {
          const fullPath = path.join(dir, entry.name);
          const stat = await fs.stat(fullPath);
          return {
            fileName: entry.name,
            fullPath,
            size: stat.size,
            updatedAt: stat.mtime.toISOString(),
          };
        }),
    );

    const sorted = items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, pageSize);
    return { items: sorted, total: sorted.length };
  }

  async getArtifact(fileName: string) {
    const safeName = path.basename(fileName);
    const fullPath = path.join(
      this.getWorkspaceRoot(),
      "storage",
      "auto-update",
      "candidates",
      safeName,
    );
    let raw: string;
    try {
      raw = await fs.readFile(fullPath, "utf8");
    } catch {
      throw new NotFoundException(`Artifact "${safeName}" not found`);
    }
    return {
      fileName: safeName,
      fullPath,
      content: JSON.parse(raw),
      raw,
    };
  }

  async testStep(sourceId: string, dto: PreviewCrawlStepDto) {
    const source = await this.prisma.client.crawlSource.findFirst({
      where: { id: sourceId, ...activeOnly },
      include: {
        rules: {
          where: { ...activeOnly },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          include: {
            fields: {
              where: { ...activeOnly },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            },
          },
        },
        records: {
          where: { ...activeOnly },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!source) throw new NotFoundException("Crawl source not found");

    const adapter = this.resolveAdapter(source.adapterType);
    const ctx = this.createPreviewContext(sourceId);
    const rule = dto.ruleId
      ? (source.rules.find((item) => item.id === dto.ruleId) ??
        (await this.findRuleById(dto.ruleId)))
      : (source.rules[0] ?? null);

    if (dto.phase === "LIST") {
      const categories = await this.safePreview<CrawlCategoryDTO[]>(
        () => adapter.getCategories(ctx),
        "getCategories",
      );
      const category = categories[0];
      const { items, cursor } = await this.safePreview<{
        items: CrawlToolListItemDTO[];
        cursor?: unknown;
      }>(() => adapter.getTools(ctx, category as CrawlCategoryDTO | undefined), "getTools");

      return {
        phase: "LIST",
        source: this.toPreviewSource(source),
        rule: rule ? this.toPreviewRule(rule) : null,
        summary: {
          categoriesCount: categories.length,
          listItemsCount: items.length,
          nextCursor: cursor ?? null,
        },
        categories: categories.slice(0, 5),
        listItems: items.slice(0, 10),
        sampleUrls: items
          .slice(0, 10)
          .map((item) => item.url || item.website)
          .filter(Boolean),
      };
    }

    if (dto.phase === "DETAIL") {
      const { items } = await this.safePreview<{
        items: CrawlToolListItemDTO[];
      }>(() => adapter.getTools(ctx, undefined), "getTools");
      const item = items[0];
      const detail = item
        ? await this.safePreview(
            () => adapter.getDetail(ctx, item as CrawlToolListItemDTO),
            "getDetail",
          )
        : null;

      return {
        phase: "DETAIL",
        source: this.toPreviewSource(source),
        rule: rule ? this.toPreviewRule(rule) : null,
        summary: {
          listItemsCount: items.length,
          detailFound: Boolean(detail),
        },
        listItem: item,
        detail,
        sampleUrl: item?.url || item?.website || null,
      };
    }

    const record = source.records[0] ?? null;
    const randomRecord =
      source.records.length > 1
        ? source.records[Math.floor(Math.random() * source.records.length)]
        : record;

    return {
      phase: "CONTENT",
      source: this.toPreviewSource(source),
      rule: rule ? this.toPreviewRule(rule) : null,
      summary: {
        recordCount: source.records.length,
      },
      record: randomRecord
        ? {
            id: randomRecord.id,
            title: randomRecord.title,
            sourceUrl: randomRecord.sourceUrl,
            status: randomRecord.status,
            rawData: randomRecord.rawData,
            parsedData: randomRecord.parsedData,
            cleanedData: randomRecord.cleanedData,
            metadata: randomRecord.metadata,
            createdAt: randomRecord.createdAt,
          }
        : null,
      sampleUrl: randomRecord?.sourceUrl ?? null,
    };
  }

  private resolveAdapter(adapterType: string): StructuredSiteAdapter {
    const adapter = globalAdapterRegistry.get(adapterType);
    if (!(adapter instanceof StructuredSiteAdapter)) {
      throw new NotFoundException(`Crawler adapter "${adapterType}" is not registered`);
    }
    return adapter;
  }

  private createPreviewContext(sourceId: string): CrawlerContext {
    return createCrawlerContext({
      sourceId,
      fetch: async (request) => {
        const timeoutMs = request.timeoutMs ?? 30_000;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const startedAt = Date.now();
          const response = await fetch(request.url, {
            method: request.method ?? "GET",
            headers: request.headers,
            body: request.body,
            signal: controller.signal,
          });
          const body = await response.text();
          return createCrawlResponse(request.url, {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body,
            durationMs: Date.now() - startedAt,
            cursor: request.cursor,
          });
        } finally {
          clearTimeout(timer);
        }
      },
    });
  }

  private async safePreview<T>(factory: () => Promise<T>, label: string): Promise<T> {
    const timeoutMs = 30_000;
    const timeout = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(new Error(`${label} preview timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([factory(), timeout]);
  }

  private toPreviewSource(source: {
    id: string;
    name: string;
    slug: string;
    baseUrl: string;
    adapterType: string;
    kind: string;
  }) {
    return {
      id: source.id,
      name: source.name,
      slug: source.slug,
      baseUrl: source.baseUrl,
      adapterType: source.adapterType,
      kind: source.kind,
    };
  }

  private toPreviewRule(rule: { id: string; name: string; code: string; ruleType: string }) {
    return {
      id: rule.id,
      name: rule.name,
      code: rule.code,
      ruleType: rule.ruleType,
    };
  }

  private resolveAutoUpdateSourceKey(
    source: { name: string; slug: string; adapterType: string },
    rule: { code: string; name: string },
  ): string {
    const candidates = [source.adapterType, source.slug, source.name, rule.code, rule.name].map(
      (value) => value.trim().toLowerCase(),
    );

    if (candidates.some((value) => value.includes("futurepedia"))) return "futurepedia";
    if (candidates.some((value) => value.includes("taaft"))) return "taaft";
    throw new NotFoundException(`No runnable source mapping found for rule "${rule.name}"`);
  }

  private getWorkspaceRoot() {
    const cwd = process.cwd();
    if (
      path.basename(cwd).toLowerCase() === "api" &&
      path.basename(path.dirname(cwd)).toLowerCase() === "apps"
    ) {
      return path.resolve(cwd, "..", "..");
    }
    return path.resolve(cwd);
  }

  private extractArtifactPaths(output: string) {
    const matchValue = (label: string) =>
      output.match(new RegExp(`\\[crawler:run\\] ${label}=([^\\r\\n]+)`))?.[1]?.trim() ?? null;
    return {
      snapshot: matchValue("snapshot"),
      report: matchValue("report"),
      log: matchValue("log"),
    };
  }
}
