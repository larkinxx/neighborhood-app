'use server'

import { createClient } from '@/lib/supabase/server'
import { findDistrictOsmId } from '@/lib/districts'

// Определяет район по точке, кликнутой на карте — используется гостевым
// выбором места на главной странице (без регистрации). Тот же point-in-polygon,
// что и в онбординге, но результат не сохраняется — только для навигации в ленту.
export async function resolveDistrict(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  const osmId = findDistrictOsmId(lat, lng)
  if (!osmId) {
    return null
  }

  const supabase = await createClient()
  const { data } = await supabase.from('districts').select('id, name').eq('osm_id', osmId).single()

  return data ?? null
}
