'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import type { Map as MapLibreMap, Marker as MapLibreMarker, MapMouseEvent } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// Москва как дефолтный центр карты — просто чтобы было куда смотреть при
// первом открытии, на сам выбор точки не влияет.
const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423]
const DEFAULT_ZOOM = 12

// OpenFreeMap — полностью бесплатные векторные тайлы без ключа и лимитов.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

// С версии 6 maplibre-gl больше не собирает классический бандл для
// <script src>, только ES-модуль (dist/maplibre-gl.mjs) — а версии ≤6.4.0
// с ещё живым классическим бандлом содержат критическую XSS-уязвимость
// (GHSA-jrc7-96c5-q579), так что откатываться на них нельзя. Поэтому
// грузим актуальную версию как нативный ES-модуль прямо с CDN — браузер
// импортирует её сам, минуя сборщик Next.js целиком. Это заодно обходит
// баг Turbopack, из-за которого веб-воркер MapLibre не грузился при
// обычном npm-импорте (см. коммит 9f2e853): раз код вообще не проходит
// через Turbopack, тот баг просто не может проявиться.
const MAPLIBRE_VERSION = '6.9.0'
const MAPLIBRE_LOADER_SCRIPT = `
import * as maplibregl from 'https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.mjs';
window.maplibregl = maplibregl;
window.dispatchEvent(new Event('maplibregl:ready'));
`

declare global {
  interface Window {
    maplibregl?: typeof import('maplibre-gl')
  }
}

type Coords = { lat: number; lng: number }

export default function HomeMapPicker({
  onChange,
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  initialCoords,
  hint = 'Кликните по карте в том месте, где находится ваш дом',
}: {
  onChange: (coords: Coords) => void
  // Центр и стартовая точка — например, дом пользователя вместо центра
  // Москвы, когда карта используется не для онбординга, а для выбора
  // места конкретного поста.
  initialCenter?: [number, number]
  initialZoom?: number
  initialCoords?: Coords
  hint?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRef = useRef<MapLibreMarker | null>(null)
  const [coords, setCoords] = useState<Coords | null>(initialCoords ?? null)
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== 'undefined' && !!window.maplibregl
  )

  // Модульный скрипт с одним и тем же id Next.js вставляет в документ один
  // раз за всю сессию (при повторном монтировании компонента — например,
  // при переходе между онбордингом и гостевой картой — просто переиспользует
  // уже выполненный тег), поэтому событие может не прийти повторно —
  // подстраховываемся проверкой window.maplibregl при каждом монтировании.
  useEffect(() => {
    // Если window.maplibregl уже есть на момент монтирования, ленивый
    // инициализатор useState выше уже это учёл — здесь только подписка
    // на случай, если скрипт ещё грузится.
    if (scriptReady) return
    function onReady() {
      setScriptReady(true)
    }
    window.addEventListener('maplibregl:ready', onReady)
    return () => window.removeEventListener('maplibregl:ready', onReady)
  }, [scriptReady])

  useEffect(() => {
    if (!scriptReady || !containerRef.current || mapRef.current) return
    const maplibregl = window.maplibregl
    if (!maplibregl) return

    // MapLibre принимает центр как [lng, lat], а не [lat, lng].
    const center: [number, number] = initialCoords
      ? [initialCoords.lng, initialCoords.lat]
      : [initialCenter[1], initialCenter[0]]

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center,
      zoom: initialZoom,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')

    function placeMarker(lat: number, lng: number) {
      if (!maplibregl) return
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat])
      } else {
        const marker = new maplibregl.Marker({ draggable: true, color: '#dc2626' })
          .setLngLat([lng, lat])
          .addTo(map)
        marker.on('dragend', () => {
          const pos = marker.getLngLat()
          setCoords({ lat: pos.lat, lng: pos.lng })
          onChange({ lat: pos.lat, lng: pos.lng })
        })
        markerRef.current = marker
      }
      setCoords({ lat, lng })
      onChange({ lat, lng })
    }

    map.on('click', (e: MapMouseEvent) => {
      placeMarker(e.lngLat.lat, e.lngLat.lng)
    })

    if (initialCoords) {
      placeMarker(initialCoords.lat, initialCoords.lng)
    }

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady])

  return (
    <div>
      <Script id="maplibre-esm-loader" type="module" strategy="afterInteractive">
        {MAPLIBRE_LOADER_SCRIPT}
      </Script>
      <div
        ref={containerRef}
        className="h-[400px] w-full rounded-xl border border-black/10 dark:border-white/10"
      />
      <p className="mt-2 text-sm text-zinc-500">
        {coords
          ? `Точка: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)} — можно перетащить маркер, чтобы уточнить`
          : hint}
      </p>
    </div>
  )
}
