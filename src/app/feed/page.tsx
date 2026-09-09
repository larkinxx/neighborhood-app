import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from './actions'

export default async function FeedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-zinc-50 p-16 dark:bg-black">
      <div className="w-full max-w-lg rounded-xl border border-black/10 bg-white p-8 dark:border-white/10 dark:bg-zinc-950">
        <h1 className="mb-2 text-xl font-semibold text-black dark:text-zinc-50">
          Лента
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Вы вошли как {user.email ?? user.phone}
        </p>
        <form action={signOut} className="mt-6">
          <button className="rounded-md border border-black/10 px-4 py-2 text-sm dark:border-white/10">
            Выйти
          </button>
        </form>
      </div>
    </div>
  )
}
