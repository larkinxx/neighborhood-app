'use client'

import { useState, useTransition } from 'react'
import HomeMapPicker from '@/components/HomeMapPicker'
import { saveHomeLocation } from './actions'

export default function OnboardingForm() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [radius, setRadius] = useState(800)
  const [homeComplex, setHomeComplex] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!coords) {
      setError('Сначала поставьте точку на карте — кликните по месту, где вы живёте')
      return
    }
    setError(null)

    const formData = new FormData()
    formData.set('lat', String(coords.lat))
    formData.set('lng', String(coords.lng))
    formData.set('home_complex', homeComplex)
    formData.set('radius_m', String(radius))

    startTransition(async () => {
      try {
        await saveHomeLocation(formData)
      } catch (err) {
        // redirect() внутри saveHomeLocation бросает специальный объект,
        // который next.js обрабатывает сам — здесь ловим только реальные ошибки
        if (err instanceof Error && err.message) {
          setError(err.message)
        }
      }
    })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-6">
      <h1 className="mb-2 text-xl font-semibold text-black dark:text-zinc-50">
        Где вы живёте?
      </h1>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Кликните на карте по месту, где находится ваш дом. Мы будем показывать вам
        посты соседей в радиусе {radius} м от этой точки.
      </p>

      <HomeMapPicker onChange={setCoords} />

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <label className="text-sm text-zinc-600 dark:text-zinc-400">
          Название ЖК/дома (необязательно)
          <input
            type="text"
            value={homeComplex}
            onChange={(e) => setHomeComplex(e.target.value)}
            placeholder="ЖК Северный, корп. 2"
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-black dark:border-white/10 dark:bg-black dark:text-zinc-50"
          />
        </label>

        <label className="text-sm text-zinc-600 dark:text-zinc-400">
          Радиус ленты
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-black dark:border-white/10 dark:bg-black dark:text-zinc-50"
          >
            <option value={500}>500 м</option>
            <option value={800}>800 м (рекомендуется)</option>
            <option value={1000}>1000 м</option>
          </select>
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-md bg-black px-4 py-2 text-white transition-transform duration-150 [transition-timing-function:var(--ease-out-strong)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? 'Сохраняем…' : 'Сохранить и перейти в ленту'}
        </button>
      </form>
    </div>
  )
}
