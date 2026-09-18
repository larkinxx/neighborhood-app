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

  // .select().single() после update — не просто чтобы получить данные
  // обратно, а чтобы ПОЙМАТЬ случай, когда update молча затронул 0 строк
  // (RLS не пропустила запись, или профиля не нашлось): PostgREST в этом
  // случае сам вернёт ошибку в error, а не тихо отдаст пустой результат —
  // без .single() такой сбой было бы не отличить от настоящего успеха.
  const { data: updated, error } = await supabase
    .from('users')
    .update({
      home_lat: lat,
      home_lng: lng,
      home_complex: homeComplex,
      radius_m: radiusM,
      district_id: districtId,
    })
    .eq('id', user.id)
    .select('id')
    .single()

  if (error || !updated) {
    // ВАЖНО: не throw. Next.js в продакшене подменяет текст любой
    // выброшенной из Server Action ошибки на общий "Minified React
    // error #441…" (та же обфускация, что и для ошибок рендера серверных
    // компонентов) — именно это мы и увидели на экране онбординга.
    // Возврат объекта с error вместо throw — рекомендованный Next.js
    // паттерн для ожидаемых/обрабатываемых ошибок: такой текст доходит
    // до клиента как есть, без обфускации.
    console.error('saveHomeLocation: update users failed', {
      userId: user.id,
      lat,
      lng,
      districtId,
      error,
    })
    return {
      error: error?.message
        ? `Не удалось сохранить адрес: ${error.message}`
        : 'Не удалось сохранить адрес — профиль не найден или нет прав на изменение',
    }
  }

  redirect('/feed')
}
