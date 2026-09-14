// Единственный админ пилота — доступ определяется email из сессии.
// Реальная граница безопасности — RLS-политики в
// supabase/migrations/20260914090000_moderation_and_verification.sql
// (захардкожен тот же адрес), эта константа только для UI-проверок на
// страницах/в server actions, чтобы не плодить магические строки.
export const ADMIN_EMAIL = 'denisatepin45@gmail.com'

export function isAdmin(email: string | null | undefined) {
  return email === ADMIN_EMAIL
}
