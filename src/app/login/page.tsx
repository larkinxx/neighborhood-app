'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Временный вход по email (magic link), пока не решён вопрос с доставкой
// SMS на +7. Когда будет готов SMS-провайдер/Auth Hook — вернуть форму
// с телефоном (см. git-историю этого файла) или предложить оба способа.
export default function LoginPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-8 dark:border-white/10 dark:bg-zinc-950">
        <h1 className="mb-6 text-xl font-semibold text-black dark:text-zinc-50">
          Вход по почте
        </h1>

        {!sent ? (
          <form onSubmit={sendLink} className="flex flex-col gap-4">
            <label className="text-sm text-zinc-600 dark:text-zinc-400">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-black dark:border-white/10 dark:bg-black dark:text-zinc-50"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {loading ? 'Отправляем…' : 'Получить ссылку для входа'}
            </button>
          </form>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Письмо со ссылкой отправлено на {email}. Откройте его и перейдите
            по ссылке — она вернёт вас сюда уже авторизованным.
          </p>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </div>
  )
}
