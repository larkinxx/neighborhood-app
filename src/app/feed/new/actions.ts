'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { findDistrictOsmId } from '@/lib/districts'

const POST_TYPES = ['announcement', 'found', 'service', 'emergency'] as const
type PostType = (typeof POST_TYPES)[number]

function isPostType(value: string | null): value is PostType {
  return !!value && (POST_TYPES as readonly string[]).includes(value)
}

export async function createPost(formData: FormData) {
  const type = formData.get('type') as string | null
  const text = (formData.get('text') as string | null)?.trim() ?? ''
  const lat = Number(formData.get('lat'))
  const lng = Number(formData.get('lng'))

  if (!isPostType(type)) {
    throw new Error('Выберите тип поста')
  }
  if (text.length < 1 || text.length > 2000) {
    throw new Error('Текст поста должен быть от 1 до 2000 символов')
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Отметьте место на карте')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Район поста — для анонимного просмотра ленты по району (см.
  // findDistrictOsmId и districts). Точка может не попасть ни в один
  // полигон — тогда district_id остаётся null, публикацию это не блокирует,
  // просто пост не появится в гостевой ленте по району.
  let districtId: string | null = null
  const osmId = findDistrictOsmId(lat, lng)
  if (osmId) {
    const { data: district } = await supabase
      .from('districts')
      .select('id')
      .eq('osm_id', osmId)
      .single()
    districtId = district?.id ?? null
  }

  const { error } = await supabase.from('posts').insert({
    author_id: user.id,
    type,
    text,
    lat,
    lng,
    district_id: districtId,
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect('/feed')
}
