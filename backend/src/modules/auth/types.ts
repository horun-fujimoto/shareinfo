export type LoginBody = {
  userId: string
  password: string
}

export type ChangePasswordBody = {
  currentPassword: string
  newPassword: string
}

export type SetInitialPasswordBody = {
  newPassword: string
}
