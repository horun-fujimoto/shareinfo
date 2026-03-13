import DOMPurify from 'dompurify'

/**
 * HTMLコンテンツをサニタイズして安全に表示する
 * DOMPurifyを使用して本格的なXSS対策を実施
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'strong', 'em', 'u', 's', 'del',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'target', 'rel',
      'class', 'style',
      'width', 'height',
    ],
    ALLOW_DATA_ATTR: false,
  })
}
