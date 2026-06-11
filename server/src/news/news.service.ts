import type { NewsPost } from '../generated/prisma/index.js'
import { prisma } from '../config/database.js'

export type NewsPostDto = {
  slug: string
  title: string
  excerpt: string
  date: string
  readMinutes: number
  tags: string[]
  body: string[]
  imageUrls: string[]
}

function slugifyTitle(raw: string): string {
  const base = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return base || `article-${Date.now()}`
}

function extractImageUrls(content: string): string[] {
  const urls: string[] = []
  const re = /!\[[^\]]*]\(([^)]+)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    if (m[1]) urls.push(m[1])
  }
  return urls
}

function plainExcerpt(content: string, max = 220): string {
  const stripped = content
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (stripped.length <= max) return stripped
  return `${stripped.slice(0, max - 1).trim()}…`
}

function readMinutesFromContent(content: string): number {
  const words = content
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .split(/\s+/)
    .filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

function contentToBody(content: string): string[] {
  return content
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean)
}

export function formatNewsPost(row: NewsPost): NewsPostDto {
  const date = (row.publishedAt ?? row.createdAt).toISOString().slice(0, 10)
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt || plainExcerpt(row.content),
    date,
    readMinutes: readMinutesFromContent(row.content),
    tags: ['Actualité'],
    body: contentToBody(row.content),
    imageUrls: extractImageUrls(row.content),
  }
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = slugifyTitle(base)
  let n = 0
  for (;;) {
    const candidate = n === 0 ? slug : `${slug}-${n}`
    const existing = await prisma.newsPost.findUnique({ where: { slug: candidate } })
    if (!existing || existing.id === excludeId) return candidate
    n += 1
  }
}

export async function listPublishedNewsPosts(): Promise<NewsPostDto[]> {
  const rows = await prisma.newsPost.findMany({
    where: { published: true },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  })
  return rows.map(formatNewsPost)
}

export async function getPublishedNewsPost(slug: string): Promise<NewsPostDto | null> {
  const row = await prisma.newsPost.findFirst({
    where: { slug, published: true },
  })
  return row ? formatNewsPost(row) : null
}

export async function listAdminNewsPosts() {
  return prisma.newsPost.findMany({
    orderBy: [{ updatedAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      published: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function createNewsPost(input: {
  title: string
  content: string
  published?: boolean
  slug?: string
}) {
  const title = input.title.trim()
  const content = input.content.trim()
  if (!title || title.length > 200) throw new Error('Titre invalide')
  if (!content || content.length > 100_000) throw new Error('Contenu invalide')

  const slug = await uniqueSlug(input.slug?.trim() || title)
  const published = input.published === true
  const now = new Date()

  return prisma.newsPost.create({
    data: {
      slug,
      title,
      content,
      excerpt: plainExcerpt(content),
      published,
      publishedAt: published ? now : null,
    },
  })
}

export async function updateNewsPost(
  id: string,
  input: {
    title?: string
    content?: string
    published?: boolean
    slug?: string
  },
) {
  const existing = await prisma.newsPost.findUnique({ where: { id } })
  if (!existing) throw new Error('Article introuvable')

  const title = input.title !== undefined ? input.title.trim() : existing.title
  const content = input.content !== undefined ? input.content.trim() : existing.content
  if (!title || title.length > 200) throw new Error('Titre invalide')
  if (!content || content.length > 100_000) throw new Error('Contenu invalide')

  let slug = existing.slug
  if (input.slug !== undefined && input.slug.trim()) {
    slug = await uniqueSlug(input.slug.trim(), id)
  } else if (input.title !== undefined && input.title.trim() !== existing.title) {
    slug = await uniqueSlug(title, id)
  }

  const published = input.published !== undefined ? input.published : existing.published
  let publishedAt = existing.publishedAt
  if (published && !existing.published) {
    publishedAt = new Date()
  } else if (!published) {
    publishedAt = null
  }

  return prisma.newsPost.update({
    where: { id },
    data: {
      title,
      content,
      excerpt: plainExcerpt(content),
      slug,
      published,
      publishedAt,
    },
  })
}

export async function deleteNewsPost(id: string) {
  await prisma.newsPost.delete({ where: { id } })
}
