import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@ai-tool-cms/database";
import { ToolStatus } from "@ai-tool-cms/database";
import { slugify } from "@ai-tool-cms/common";
import { activeOnly } from "../common/prisma.util";
import { paginate, type PaginationQueryDto } from "../common/dto/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";
import type { BlogArticleDto, BlogCategoryDto, BlogTagDto } from "./dto/blog.dto";

const articleInclude = {
  category: true,
  author: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
  tags: { where: activeOnly, include: { tag: true }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.BlogArticleInclude;

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async listArticles(query: PaginationQueryDto) {
    const { skip, take } = paginate(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.client.blogArticle.findMany({
        where: activeOnly,
        include: articleInclude,
        orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
        skip,
        take,
      }),
      this.prisma.client.blogArticle.count({ where: activeOnly }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async listPublicArticles(query: PaginationQueryDto) {
    const { skip, take } = paginate(query.page, query.pageSize);
    const where = this.publicArticleWhere();
    const [items, total] = await Promise.all([
      this.prisma.client.blogArticle.findMany({
        where,
        include: articleInclude,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take,
      }),
      this.prisma.client.blogArticle.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async publicBySlug(slug: string) {
    const article = await this.prisma.client.blogArticle.findFirst({
      where: { slug, ...this.publicArticleWhere() },
      include: articleInclude,
    });
    if (!article) throw new NotFoundException("Article not found");
    return article;
  }

  async relatedArticles(articleId: string, tagIds: string[], categoryId?: string | null) {
    return this.prisma.client.blogArticle.findMany({
      where: {
        ...this.publicArticleWhere(),
        id: { not: articleId },
        OR: [
          ...(tagIds.length ? [{ tags: { some: { tagId: { in: tagIds }, ...activeOnly } } }] : []),
          ...(categoryId ? [{ categoryId }] : []),
        ],
      },
      include: articleInclude,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 4,
    });
  }

  async findArticle(id: string) {
    const article = await this.prisma.client.blogArticle.findFirst({ where: { id, ...activeOnly }, include: articleInclude });
    if (!article) throw new NotFoundException("Article not found");
    return article;
  }

  async createArticle(dto: BlogArticleDto, actorId: string) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.title);
    await this.ensureArticleSlugAvailable(slug);
    const status = this.resolveStatus(dto);
    const article = await this.prisma.client.blogArticle.create({
      data: {
        slug,
        title: dto.title,
        excerpt: dto.excerpt,
        content: dto.content,
        status,
        coverImageUrl: dto.coverImageUrl,
        categoryId: dto.categoryId,
        authorId: actorId,
        scheduledAt: parseDate(dto.scheduledAt),
        publishedAt: status === ToolStatus.PUBLISHED ? parseDate(dto.publishedAt) ?? new Date() : parseDate(dto.publishedAt),
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        ogImageUrl: dto.ogImageUrl,
        canonicalUrl: dto.canonicalUrl,
        createdById: actorId,
      },
    });
    await this.syncArticleTags(article.id, dto.tagIds ?? []);
    return this.findArticle(article.id);
  }

  async updateArticle(id: string, dto: BlogArticleDto, actorId: string) {
    await this.findArticle(id);
    if (dto.slug) await this.ensureArticleSlugAvailable(slugify(dto.slug), id);
    const status = this.resolveStatus(dto);
    await this.prisma.client.blogArticle.update({
      where: { id },
      data: {
        title: dto.title,
        slug: dto.slug ? slugify(dto.slug) : undefined,
        excerpt: dto.excerpt,
        content: dto.content,
        status,
        coverImageUrl: dto.coverImageUrl,
        categoryId: dto.categoryId,
        scheduledAt: parseDate(dto.scheduledAt),
        publishedAt: status === ToolStatus.PUBLISHED ? parseDate(dto.publishedAt) ?? new Date() : parseDate(dto.publishedAt),
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        ogImageUrl: dto.ogImageUrl,
        canonicalUrl: dto.canonicalUrl,
        updatedById: actorId,
      },
    });
    if (dto.tagIds) await this.syncArticleTags(id, dto.tagIds);
    return this.findArticle(id);
  }

  async removeArticle(id: string, actorId: string) {
    await this.findArticle(id);
    return this.prisma.client.blogArticle.update({ where: { id }, data: { deletedAt: new Date(), deletedById: actorId } });
  }

  async listCategories(query: PaginationQueryDto) {
    const { skip, take } = paginate(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.client.blogCategory.findMany({ where: activeOnly, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], skip, take }),
      this.prisma.client.blogCategory.count({ where: activeOnly }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async createCategory(dto: BlogCategoryDto, actorId: string) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    await this.ensureCategorySlugAvailable(slug);
    return this.prisma.client.blogCategory.create({ data: { ...dto, slug, createdById: actorId } });
  }

  async updateCategory(id: string, dto: BlogCategoryDto, actorId: string) {
    await this.ensureCategoryExists(id);
    if (dto.slug) await this.ensureCategorySlugAvailable(slugify(dto.slug), id);
    return this.prisma.client.blogCategory.update({ where: { id }, data: { ...dto, slug: dto.slug ? slugify(dto.slug) : undefined, updatedById: actorId } });
  }

  async removeCategory(id: string, actorId: string) {
    await this.ensureCategoryExists(id);
    return this.prisma.client.blogCategory.update({ where: { id }, data: { deletedAt: new Date(), deletedById: actorId } });
  }

  async listTags(query: PaginationQueryDto) {
    const { skip, take } = paginate(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.client.blogTag.findMany({ where: activeOnly, orderBy: { name: "asc" }, skip, take }),
      this.prisma.client.blogTag.count({ where: activeOnly }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async createTag(dto: BlogTagDto, actorId: string) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    await this.ensureTagSlugAvailable(slug);
    return this.prisma.client.blogTag.create({ data: { ...dto, slug, createdById: actorId } });
  }

  async updateTag(id: string, dto: BlogTagDto, actorId: string) {
    await this.ensureTagExists(id);
    if (dto.slug) await this.ensureTagSlugAvailable(slugify(dto.slug), id);
    return this.prisma.client.blogTag.update({ where: { id }, data: { ...dto, slug: dto.slug ? slugify(dto.slug) : undefined, updatedById: actorId } });
  }

  async removeTag(id: string, actorId: string) {
    await this.ensureTagExists(id);
    return this.prisma.client.blogTag.update({ where: { id }, data: { deletedAt: new Date(), deletedById: actorId } });
  }

  private publicArticleWhere() {
    return {
      ...activeOnly,
      status: ToolStatus.PUBLISHED,
      OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
    };
  }

  private resolveStatus(dto: BlogArticleDto) {
    if (dto.publishNow) return ToolStatus.PUBLISHED;
    if (dto.scheduledAt && dto.status !== ToolStatus.PUBLISHED) return ToolStatus.SCHEDULED;
    return dto.status ?? ToolStatus.DRAFT;
  }

  private async syncArticleTags(articleId: string, tagIds: string[]) {
    const uniqueTagIds = [...new Set(tagIds)];
    await this.prisma.client.blogArticleTag.updateMany({ where: { articleId, ...activeOnly }, data: { deletedAt: new Date() } });
    for (const tagId of uniqueTagIds) {
      await this.ensureTagExists(tagId);
      await this.prisma.client.blogArticleTag.upsert({
        where: { articleId_tagId: { articleId, tagId } },
        create: { articleId, tagId },
        update: { deletedAt: null },
      });
    }
  }

  private async ensureArticleSlugAvailable(slug: string, currentId?: string) {
    const existing = await this.prisma.client.blogArticle.findFirst({ where: { slug, ...activeOnly, ...(currentId ? { id: { not: currentId } } : {}) }, select: { id: true } });
    if (existing) throw new ConflictException(`Article slug '${slug}' already exists`);
  }

  private async ensureCategorySlugAvailable(slug: string, currentId?: string) {
    const existing = await this.prisma.client.blogCategory.findFirst({ where: { slug, ...activeOnly, ...(currentId ? { id: { not: currentId } } : {}) }, select: { id: true } });
    if (existing) throw new ConflictException(`Blog category slug '${slug}' already exists`);
  }

  private async ensureTagSlugAvailable(slug: string, currentId?: string) {
    const existing = await this.prisma.client.blogTag.findFirst({ where: { slug, ...activeOnly, ...(currentId ? { id: { not: currentId } } : {}) }, select: { id: true } });
    if (existing) throw new ConflictException(`Blog tag slug '${slug}' already exists`);
  }

  private async ensureCategoryExists(id: string) {
    const item = await this.prisma.client.blogCategory.findFirst({ where: { id, ...activeOnly }, select: { id: true } });
    if (!item) throw new NotFoundException("Blog category not found");
  }

  private async ensureTagExists(id: string) {
    const item = await this.prisma.client.blogTag.findFirst({ where: { id, ...activeOnly }, select: { id: true } });
    if (!item) throw new NotFoundException("Blog tag not found");
  }
}

function parseDate(value?: string | null) {
  return value ? new Date(value) : null;
}