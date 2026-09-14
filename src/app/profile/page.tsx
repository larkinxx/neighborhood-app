import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SealCheck } from '@phosphor-icons/react/dist/ssr'
import { createClient } from '@/lib/supabase/server'
import VerificationForm from './verification-form'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('is_verified, verification_photo_path')
    .eq('id', user.id)
    .single()

  const status = profile?.is_verified ? 'verified' : profile?.verification_photo_path ? 'pending' : 'none'

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <Link
        href="/feed"
        className="text-sm font-semibold tracking-tight text-black transition-colors hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-300"
      >
        ← Соседи
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Профиль</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-black dark:text-zinc-50">
          Бейдж «Подтверждённый житель»
        </h2>

        {status === 'verified' && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
            <SealCheck size={18} weight="fill" aria-hidden="true" />
            Подтверждено — бейдж отображается на ваших постах в ленте.
          </p>
        )}

        {status === 'pending' && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Скриншот отправлен, ждём ручной проверки.
          </p>
        )}

        {status === 'none' && (
          <>
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              Загрузите скриншот квитанции ЖКХ (или другого документа с вашим адресом) — мы
              проверим вручную и добавим бейдж рядом с вашими постами.
            </p>
            <VerificationForm />
          </>
        )}
      </section>
    </div>
  )
}
