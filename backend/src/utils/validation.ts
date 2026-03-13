import { z } from 'zod'
import { Err } from '../types/errors.js'

/**
 * Zodスキーマでリクエストボディを検証する
 * 失敗時は AppError (400) をスロー
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const messages = result.error.issues.map((i) => i.message)
    throw Err.badRequest('VALIDATION_ERROR', messages)
  }
  return result.data
}

// ── Auth スキーマ ──
export const loginSchema = z.object({
  userId: z.string().min(1, 'ユーザーIDは必須です'),
  password: z.string().min(1, 'パスワードは必須です'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードは必須です'),
  newPassword: z.string().min(8, 'パスワードは8文字以上必要です'),
})

export const setInitialPasswordSchema = z.object({
  newPassword: z.string().min(8, 'パスワードは8文字以上必要です'),
})

// ── Article スキーマ ──
export const createArticleSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(30, 'タイトルは30文字以内です'),
  content: z.string().default(''),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
  tagIds: z.array(z.string().uuid()).optional(),
})

export const updateArticleSchema = z.object({
  title: z.string().min(1).max(30).optional(),
  content: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'PRIVATE']).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
})

// ── Admin User スキーマ ──
export const createUserSchema = z.object({
  userId: z.string().min(1, 'ユーザーIDは必須です').max(50),
  name: z.string().min(1, '表示名は必須です').max(100),
  email: z.string().email('メールアドレスの形式が正しくありません').optional().or(z.literal('')),
  role: z.enum(['USER', 'ADMIN']).optional().default('USER'),
  password: z.string().min(8, 'パスワードは8文字以上必要です').optional(),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  role: z.enum(['USER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})

// ── Document スキーマ ──
export const createDocumentSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(30, 'タイトルは30文字以内です'),
  content: z.string().default(''),
  published: z.boolean().optional().default(false),
})

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(30).optional(),
  content: z.string().optional(),
  published: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

// ── Comment スキーマ ──
export const createCommentSchema = z.object({
  content: z.string().min(1, 'コメント内容は必須です').max(5000),
})

// ── Tag スキーマ ──
export const createTagSchema = z.object({
  name: z.string().min(1, 'タグ名は必須です').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '色は#RRGGBB形式で指定してください').optional().default('#666666'),
})

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

// ── Profile スキーマ ──
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(1000).optional(),
})
