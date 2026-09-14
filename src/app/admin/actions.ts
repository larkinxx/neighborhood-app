'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    redirect('/feed')
  }

  return supabase
}

// Забанить пост из очереди жалоб — статус 'banned' убирает пост из ленты
// навсегда (в отличие от 'under_review', откуда можно вернуть в 'active').
export async function banPost(formData: FormData) {
  const supabase = await requireAdmin()
  const postId = formData.get('post_id') as string

  const { error } = await supabase.from('posts').update({ status: 'banned' }).eq('id', postId)
  if (error) throw new Error(error.message)

  revalidatePath('/admin')
}

// Снять жалобу — пост признан нормальным, возвращаем в ленту.
export async function dismissReport(formData: FormData) {
  const supabase = await requireAdmin()
  const postId = formData.get('post_id') as string

  const { error } = await supabase.from('posts').update({ status: 'active' }).eq('id', postId)
  if (error) throw new Error(error.message)

  revalidatePath('/admin')
}

// Подтвердить верификацию — единственное место в приложении, где
// is_verified может стать true (гарантируется триггером guard_is_verified
// на уровне БД, это не просто соглашение на уровне кода).
export async function confirmVerification(formData: FormData) {
  const supabase = await requireAdmin()
  const userId = formData.get('user_id') as string

  const { error } = await supabase.from('users').update({ is_verified: true }).eq('id', userId)
  if (error) throw new Error(error.message)

  revalidatePath('/admin')
}

// Отклонить верификацию — очищаем путь к фото, пользователь может
// отправить новый скриншот и попробовать снова.
export async function rejectVerification(formData: FormData) {
  const supabase = await requireAdmin()
  const userId = formData.get('user_id') as string

  const { error } = await supabase
    .from('users')
    .update({ verification_photo_path: null })
    .eq('id', userId)
  if (error) throw new Error(error.message)

  revalidatePath('/admin')
}
