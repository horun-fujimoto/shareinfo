export type User = {
  id: string
  userId: string
  name: string
  email: string | null
  bio: string | null
  role: 'ADMIN' | 'USER'
  status: 'ACTIVE' | 'INACTIVE'
  imageUrl: string | null
  lastLoginAt: string | null
  mustChangePassword: boolean
}

export type Tag = {
  id: string
  name: string
  color: string
  articleCount?: number
}

export type ArticleSummary = {
  id: string
  title: string
  content: string
  status: 'DRAFT' | 'PUBLISHED' | 'PRIVATE'
  likeCount: number
  viewCount: number
  commentCount: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  author: {
    id: string
    userId?: string
    name: string
    imageUrl: string | null
  }
  tags: Tag[]
}

export type ArticleDetail = ArticleSummary & {
  authorId: string
  isLiked: boolean
  isBookmarked: boolean
  attachments: FileAttachment[]
}

export type FileAttachment = {
  id: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  isInlineImage: boolean
  url?: string
}

export type Comment = {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    userId: string
    name: string
    imageUrl: string | null
  }
}

export type Notification = {
  id: string
  type: 'LIKE' | 'COMMENT'
  articleId: string | null
  commentId: string | null
  isRead: boolean
  createdAt: string
  actor: {
    id: string
    name: string
    imageUrl: string | null
  }
}

export type Document = {
  id: string
  title: string
  content: string
  sortOrder: number
  published: boolean
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    imageUrl: string | null
  }
  attachments: FileAttachment[]
}

export type UserSettings = {
  notifyOnLike: boolean
  notifyOnComment: boolean
}

export type AdminUser = {
  id: string
  userId: string
  name: string
  email: string | null
  role: 'ADMIN' | 'USER'
  status: 'ACTIVE' | 'INACTIVE'
  imageUrl: string | null
  isLocked: boolean
  loginFailCount: number
  lockedAt: string | null
  lastLoginAt: string | null
  createdAt: string
}
