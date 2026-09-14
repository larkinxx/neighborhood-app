'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

const ALLOWED_RADIUS_M = [500, 800, 1000] as const

// Радиус ленты — то же поле users.radius_m, что и на онбординге. Выбор
// на странице ленты меняет постоянную настройку пользователя (не временный
// просмотр), поэтому здесь та же логика, что в onboarding/actions.ts.
export async function updateRadius(formData: FormData) {
  const radiusM = Number(formData.get('radius_m'))
  const type = (formData.get('type') as string) || ''

  if (!ALLOWED_RADIUS_M.includes(radiusM as (typeof ALLOWED_RADIUS_M)[number])) {
    throw new Error('Недопустимый радиус')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('users')
    .update({ radius_m: radiusM })
    .eq('id', user.id)

  if (error) {
    throw new Error(error.message)
  }

  redirect(type ? `/feed?type=${type}` : '/feed')
}

// Жалоба на пост: без причины, одна кнопка. Сама смена статуса поста на
// 'under_review' (и, тем самым, его исчезновение из чужих лент) происходит
// в БД триггером on_report_created — не здесь, потому что у обычного
// пользователя нет права редактировать чужой пост (RLS "posts: update own"),
// и это правильно: сервер-экшен не должен для этого использовать более
// широкие права, чем есть у пользователя.
export async function reportPost(formData: FormData) {
  const postId = formData.get('post_id') as string | null
  if (!postId) {
    throw new Error('Не указан пост')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    post_id: postId,
  })

  // 23505 = уникальное ограничение (reporter_id, post_id) — пользователь
  // уже жаловался на этот пост раньше. Это не ошибка с точки зрения UX:
  // просто молча считаем жалобу принятой, ничего дополнительно не сообщаем.
  if (error && error.code !== '23505') {
    throw new Error(error.message)
  }

  revalidatePath('/feed')
}
