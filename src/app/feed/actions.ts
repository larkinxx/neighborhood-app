'use server'

import { redirect } from 'next/navigation'
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
