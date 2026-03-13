export const cfg = {
  port: Number(process.env.PORT || 3000),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  defaultPassword: process.env.DEFAULT_PASSWORD || 'password123',
}
