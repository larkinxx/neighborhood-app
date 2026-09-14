'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const MAX_BYTES = 8 * 1024 * 1024 // 8 МБ
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

// Загрузка скриншота квитанции для бейджа «подтверждённый житель».
// Ручная проверка админом (см. /admin) — здесь только приём файла и
// перевод в состояние "на проверке" (photo сохранён, is_verified ещё false).
export async function uploadVerificationPhoto(formData: FormData) {
  const file = formData.get('photo') as File | null

  if (!file || file.size === 0) {
    throw new Error('Выберите файл со скриншотом квитанции')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Файл слишком большой (максимум 8 МБ)')
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Поддерживаются только изображения JPG, PNG или WebP')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const path = `${user.id}/${Date.now()}.${EXT_BY_TYPE[file.type]}`

  const { error: uploadError } = await supabase.storage
    .from('verification-photos')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ verification_photo_path: path })
    .eq('id', user.id)

  if (updateError) {
    throw new Error(updateError.message)
  }

  redirect('/profile')
}
