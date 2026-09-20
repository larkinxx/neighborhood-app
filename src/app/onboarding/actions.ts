'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { findDistrictOsmId } from '@/lib/districts'

export async function saveHomeLocation(
  formData: FormData
): Promise<{ error: string } | void> {
  const lat = Number(formData.get('lat'))
  const lng = Number(formData.get('lng'))
  const homeComplex = (formData.get('home_complex') as string) || null
  const radiusM = Number(formData.get('radius_m')) || 800

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: 'Сначала поставьте точку на карте' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Точка может не попасть ни в один полигон (за пределами Москвы, либо
  // край упрощённой геометрии после mapshaper) — в этом случае district_id
  // остаётся null, регистрацию это не блокирует.
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

  // upsert, а не update: у части аккаунтов (нашли минимум один тестовый)
  // строки в public.users не оказалось вообще — триггер handle_new_user
  // должен был создать её при регистрации, но по какой-то причине не
  // сработал. update в таком случае молча находит 0 строк; upsert же сам
  // создаст запись, если её нет, и обновит, если есть — так что онбординг
  // больше не завязан на то, сработал ли когда-то триггер (для upsert'а
  // своей строки нужна отдельная RLS-политика на insert, добавлена в
  // миграции 20260920140000). .select().single() — чтобы явно поймать
  // любой другой сбой (например, нарушение constraint), а не тихо решить,
  // что всё прошло успешно.
  const { data: saved, error } = await supabase
    .from('users')
    .upsert(
      {
        id: user.id,
        email: user.email,
        home_lat: lat,
        home_lng: lng,
        home_complex: homeComplex,
        radius_m: radiusM,
        district_id: districtId,
      },
      { onConflict: 'id' }
    )
    .select('id')
    .single()

  if (error || !saved) {
    // ВАЖНО: не throw. Next.js в продакшене подменяет текст любой
    // выброшенной из Server Action ошибки на общий "Minified React
    // error #441…" (та же обфускация, что и для ошибок рендера серверных
    // компонентов) — именно это мы и увидели на экране онбординга.
    // Возврат объекта с error вместо throw — рекомендованный Next.js
    // паттерн для ожидаемых/обрабатываемых ошибок: такой текст доходит
    // до клиента как есть, без обфускации.
    console.error('saveHomeLocation: upsert users failed', {
      userId: user.id,
      lat,
      lng,
      districtId,
      error,
    })
    return {
      error: error?.message
        ? `Не удалось сохранить адрес: ${error.message}`
        : 'Не удалось сохранить адрес — попробуйте ещё раз',
    }
  }

  redirect('/feed')
}
