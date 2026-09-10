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
}: {
  onChange: (coords: Coords) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const [coords, setCoords] = useState<Coords | null>(null)

  useEffect(() => {
    let cancelled = false

    import('leaflet').then((leafletModule) => {
      if (cancelled || !containerRef.current || mapRef.current) return
      const L = leafletModule.default

      const map = L.map(containerRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
      mapRef.current = map
      // Убираем дефолтный префикс Leaflet (флаг Украины + ссылка на leafletjs.com)
      // из attribution-контрола — оставляем только обязательную по лицензии
      // атрибуцию источников тайлов ниже.
      map.attributionControl.setPrefix(false)

      // CARTO Voyager вместо стандартных тайлов OSM — тот же бесплатный слой
      // без API-ключа, но современнее выглядит (мягкая палитра, чище лейблы).
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
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
          : 'Кликните по карте в том месте, где находится ваш дом'}
      </p>
    </div>
  )
}
