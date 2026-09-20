'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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

// Геокодер для поиска адреса текстом (как на Avito) — Nominatim/OpenStreetMap:
// бесплатно и без ключа, как и сами тайлы карты (OpenFreeMap). У сервиса
// есть политика использования (максимум 1 запрос/сек, обязательна ссылка на
// авторов данных) — поэтому запрос уходит не на каждое нажатие клавиши, а
// с задержкой после того, как человек перестал печатать. Если нагрузка
// вырастет, для точности "до подъезда" по РФ и снятия лимита имеет смысл
// со временем перейти на платный геокодер (например, Яндекс) с API-ключом.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const SEARCH_DEBOUNCE_MS = 500
const MIN_QUERY_LENGTH = 3

declare global {
  interface Window {
    maplibregl?: typeof import('maplibre-gl')
  }
}

type Coords = { lat: number; lng: number }
type Suggestion = { id: string; label: string; lat: number; lng: number }

type NominatimResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

export default function HomeMapPicker({
  onChange,
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  initialCoords,
  hint = 'Кликните по карте в том месте, где находится ваш дом, или найдите адрес поиском выше',
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

  // --- Поиск адреса ---
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Вынесено из эффекта инициализации карты, чтобы вызывать и по клику на
  // карте, и при выборе адреса из подсказок поиска.
  const placeMarker = useCallback(
    (lat: number, lng: number) => {
      const maplibregl = window.maplibregl
      const map = mapRef.current
      if (!maplibregl || !map) return
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
    },
    [onChange]
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

  // Debounce + запрос к Nominatim при вводе адреса. Состояния "слишком
  // короткий запрос — очистить подсказки" обрабатываются в onChange поля
  // ввода (см. ниже), а не здесь: правило react-hooks/set-state-in-effect
  // не разрешает синхронный setState в теле эффекта — только из колбэка
  // (таймера/промиса), поэтому здесь стейт меняется только внутри
  // setTimeout, после реальной задержки.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) {
      return
    }

    const controller = new AbortController()

    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      setSearchError(null)
      try {
        const params = new URLSearchParams({
          format: 'jsonv2',
          addressdetails: '1',
          limit: '5',
          countrycodes: 'ru',
          'accept-language': 'ru',
          q: trimmed,
        })
        const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('bad response')
        const data: NominatimResult[] = await res.json()
        setSuggestions(
          data.map((item) => ({
            id: String(item.place_id),
            label: item.display_name,
            lat: Number(item.lat),
            lng: Number(item.lon),
          }))
        )
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setSuggestions([])
        setSearchError('Не удалось найти адрес — попробуйте ещё раз или кликните на карте')
      } finally {
        setIsSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [query])

  function handleSelectSuggestion(s: Suggestion) {
    placeMarker(s.lat, s.lng)
    mapRef.current?.flyTo({ center: [s.lng, s.lat], zoom: 16 })
    setQuery(s.label)
    setSuggestions([])
    setShowSuggestions(false)
  }

  return (
    <div>
      <Script id="maplibre-esm-loader" type="module" strategy="afterInteractive">
        {MAPLIBRE_LOADER_SCRIPT}
      </Script>

      <div className="relative mb-2">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const value = e.target.value
            setQuery(value)
            setShowSuggestions(true)
            if (value.trim().length < MIN_QUERY_LENGTH) {
              setSuggestions([])
              setSearchError(null)
              setIsSearching(false)
            }
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Небольшая задержка: клик по подсказке (onMouseDown ниже не даёт
            // полю потерять фокус раньше времени) должен успеть сработать
            // до того, как список подсказок скроется.
            setTimeout(() => setShowSuggestions(false), 150)
          }}
          onKeyDown={(e) => {
            // Карта используется и внутри <form> (создание поста) — Enter
            // здесь не должен сабмитить форму, только подтверждать поиск.
            if (e.key === 'Enter') {
              e.preventDefault()
              if (suggestions[0]) handleSelectSuggestion(suggestions[0])
            }
            if (e.key === 'Escape') {
              setShowSuggestions(false)
            }
          }}
          placeholder="Введите адрес или район — например, «Тверская 10» или «Кузьминки»"
          className="w-full rounded-md border border-black/10 px-3 py-2 pr-14 text-black dark:border-white/10 dark:bg-black dark:text-zinc-50"
        />
        {isSearching && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
            Ищем…
          </span>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-zinc-900">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectSuggestion(s)}
                  className="block w-full px-3 py-2 text-left text-sm text-black hover:bg-black/[.04] dark:text-zinc-50 dark:hover:bg-white/[.06]"
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        {showSuggestions && searchError && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{searchError}</p>
        )}
      </div>

      <div
        ref={containerRef}
        className="h-[400px] w-full rounded-xl border border-black/10 dark:border-white/10"
      />
      <p className="mt-2 text-sm text-zinc-500">
        {coords
          ? `Точка: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)} — можно перетащить маркер, чтобы уточнить`
          : hint}
      </p>
      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
        Поиск адреса — OpenStreetMap Nominatim, © участники OpenStreetMap
      </p>
    </div>
  )
}
