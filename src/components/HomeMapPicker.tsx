'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Москва как дефолтный центр карты — просто чтобы было куда смотреть при
// первом открытии, на сам выбор точки не влияет.
const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423]
const DEFAULT_ZOOM = 12

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
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const [coords, setCoords] = useState<Coords | null>(initialCoords ?? null)

  useEffect(() => {
    let cancelled = false

    import('leaflet').then((leafletModule) => {
      if (cancelled || !containerRef.current || mapRef.current) return
      const L = leafletModule.default

      const map = L.map(containerRef.current).setView(
        initialCoords ? [initialCoords.lat, initialCoords.lng] : initialCenter,
        initialZoom
      )
      mapRef.current = map
      // Убираем дефолтный префикс Leaflet (флаг Украины + ссылка на leafletjs.com)
      // из attribution-контрола — оставляем только обязательную по лицензии
      // атрибуцию источников тайлов ниже.
      map.attributionControl.setPrefix(false)

      // Стандартные тайлы OSM — CARTO Voyager (использовался раньше) теперь
      // требует API-ключ у анонимных запросов и рендерит плашку "API KEY
      // REQUIRED" вместо карты, так что вернули действительно бесключевой слой.
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      // Иконки маркера грузим с CDN — иначе бандлер next.js ломает пути
      // к дефолтным картинкам leaflet при сборке.
      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })

      function placeMarker(lat: number, lng: number) {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else {
          const marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map)
          marker.on('dragend', () => {
            const pos = marker.getLatLng()
            setCoords({ lat: pos.lat, lng: pos.lng })
            onChange({ lat: pos.lat, lng: pos.lng })
          })
          markerRef.current = marker
        }
        setCoords({ lat, lng })
        onChange({ lat, lng })
      }

      map.on('click', (e) => {
        placeMarker(e.latlng.lat, e.latlng.lng)
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
