'use client'

import { useRef, useState, useTransition } from 'react'
import { uploadVerificationPhoto } from './actions'

export default function VerificationForm() {
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await uploadVerificationPhoto(formData)
      } catch (err) {
        // redirect() внутри uploadVerificationPhoto бросает специальный
        // объект, который next.js обрабатывает сам — ловим только реальные ошибки
        if (err instanceof Error && err.message) {
          setError(err.message)
        }
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-black/20 px-4 py-6 text-center text-sm text-zinc-600 transition-colors hover:border-black/40 dark:border-white/20 dark:text-zinc-400 dark:hover:border-white/40">
        {fileName ?? 'Выбрать скриншот квитанции'}
        <input
          type="file"
          name="photo"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending || !fileName}
        className="cursor-pointer rounded-md bg-black px-4 py-2 text-sm text-white transition-transform duration-150 [transition-timing-function:var(--ease-out-strong)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? 'Отправляем…' : 'Отправить на проверку'}
      </button>
    </form>
  )
}
