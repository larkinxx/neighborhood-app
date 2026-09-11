'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap, Marker as MapLibreMarker, MapMouseEvent } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// Москва как дефолтный центр карты — просто чтобы было куда смотреть при
// первом открытии, на сам выбор точки не влияет.
const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423]
const DEFAULT_ZOOM = 12

// OpenFreeMap — полностью бесплатные векторные тайлы без ключа и лимитов
// (в отличие от CARTO, который в какой-то момент стал требовать API-ключ
// даже для анонимных запросов). Стиль Liberty — современная, детальная
// картография, похожая по духу на прежний CARTO Voyager.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

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

  useEffect(() => {
    let cancelled = false

    import('maplibre-gl').then((maplibreModule) => {
      if (cancelled || !containerRef.current || mapRef.current) return
      const maplibregl = maplibreModule

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
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
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
