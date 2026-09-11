'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import HomeMapPicker from '@/components/HomeMapPicker'
import { resolveDistrict } from '@/app/actions'

export default function GuestLocationPicker() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [notFound, setNotFound] = useState(false)

  function handleChange(coords: { lat: number; lng: number }) {
    setNotFound(false)
    startTransition(async () => {
      const district = await resolveDistrict(coords.lat, coords.lng)
      if (district) {
        router.push(`/feed?district=${district.id}`)
      } else {
        setNotFound(true)
      }
    })
  }

  return (
    <div className="w-full">
      <HomeMapPicker
        onChange={handleChange}
        hint="Кликните по карте — покажем посты соседей в этом районе"
      />
      {pending && (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">Определяем район…</p>
      )}
      {notFound && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Не удалось определить район для этой точки — попробуйте кликнуть в другом месте Москвы.
        </p>
      )}
    </div>
  )
}
