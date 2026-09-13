'use client'

import Link from 'next/link'
import { useId, useState, useTransition } from 'react'
import {
  ArrowLeft,
  Binoculars,
  Megaphone,
  Warning,
  Wrench,
  type Icon,
} from '@phosphor-icons/react'
import HomeMapPicker from '@/components/HomeMapPicker'
import { createPost } from './actions'

const POST_TYPES = ['announcement', 'found', 'service', 'emergency'] as const
type PostType = (typeof POST_TYPES)[number]

const TYPE_LABELS: Record<PostType, string> = {
  announcement: 'Объявление',
  found: 'Находка',
  service: 'Услуга',
  emergency: 'ЧП',
}

const TYPE_ICONS: Record<PostType, Icon> = {
  announcement: Megaphone,
  found: Binoculars,
  service: Wrench,
  emergency: Warning,
}

const TEXT_MAX_LENGTH = 2000

export default function NewPostForm({
  homeLat,
  homeLng,
}: {
  homeLat: number
  homeLng: number
}) {
  const textId = useId()
  const [type, setType] = useState<PostType | null>(null)
  const [text, setText] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!type) {
      setError('Выберите тип поста')
      return
    }
    if (text.trim().length < 1) {
      setError('Напишите текст поста')
      return
    }
    if (!coords) {
      setError('Отметьте место на карте')
      return
    }
    setError(null)

    const formData = new FormData()
    formData.set('type', type)
    formData.set('text', text.trim())
    formData.set('lat', String(coords.lat))
    formData.set('lng', String(coords.lng))

    startTransition(async () => {
      try {
        await createPost(formData)
      } catch (err) {
        // redirect() внутри createPost бросает специальный объект,
        // который next.js обрабатывает сам — здесь ловим только реальные ошибки
        if (err instanceof Error && err.message) {
          setError(err.message)
        }
      }
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
        <div>
          <Link
            href="/feed"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-600 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Назад к ленте
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-black dark:text-zinc-50">
            Новый пост
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm text-zinc-600 dark:text-zinc-400">Тип поста</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {POST_TYPES.map((t) => {
                const TypeIcon = TYPE_ICONS[t]
                const active = type === t
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setType(t)}
                    className={[
                      'flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-transform duration-150',
                      '[transition-timing-function:var(--ease-out-strong)] active:scale-[0.97]',
                      active
                        ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                        : 'border-black/10 text-black hover:bg-black/[.04] dark:border-white/10 dark:text-zinc-50 dark:hover:bg-white/[.06]',
                    ].join(' ')}
                  >
                    <TypeIcon size={22} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
                    {TYPE_LABELS[t]}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <label htmlFor={textId} className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Текст поста</span>
            <textarea
              id={textId}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, TEXT_MAX_LENGTH))}
              rows={5}
              placeholder="Что случилось, что нашли, какая нужна помощь…"
              className="w-full resize-none rounded-md border border-black/10 px-3 py-2 text-black dark:border-white/10 dark:bg-black dark:text-zinc-50"
            />
            <span className="self-end text-xs text-zinc-500 dark:text-zinc-500">
              {text.length} / {TEXT_MAX_LENGTH}
            </span>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Место на карте</span>
            <HomeMapPicker
              onChange={setCoords}
              initialCenter={[homeLat, homeLng]}
              hint="Кликните по карте, где это произошло — по умолчанию открыто рядом с вашим домом"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="cursor-pointer rounded-md bg-black px-4 py-2 text-white transition-transform duration-150 [transition-timing-function:var(--ease-out-strong)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {pending ? 'Публикуем…' : 'Опубликовать'}
          </button>
        </form>
      </div>
    </div>
  )
}
