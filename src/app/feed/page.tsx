import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from './actions'
import RadiusFilter from '@/components/RadiusFilter'

const TYPE_ORDER = ['announcement', 'found', 'service', 'emergency'] as const
type PostType = (typeof TYPE_ORDER)[number]

const TYPE_LABELS: Record<PostType, string> = {
  announcement: 'Объявления',
  found: 'Находки',
  service: 'Услуги',
  emergency: 'ЧП',
}

const TYPE_BADGE_CLASS: Record<PostType, string> = {
  announcement: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  found: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  service: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  emergency: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'на модерации',
  hidden: 'скрыт',
}

function isPostType(value: string | undefined): value is PostType {
  return !!value && (TYPE_ORDER as readonly string[]).includes(value)
}

function tabClass(active: boolean) {
  return [
    'flex h-9 items-center rounded-md px-3 text-sm font-medium transition-transform duration-150',
    '[transition-timing-function:var(--ease-out-strong)] active:scale-[0.97]',
    active
      ? 'bg-black text-white dark:bg-white dark:text-black'
      : 'border border-black/10 text-black hover:bg-black/[.04] dark:border-white/10 dark:text-zinc-50 dark:hover:bg-white/[.06]',
  ].join(' ')
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type: rawType } = await searchParams
  const type = isPostType(rawType) ? rawType : undefined

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('home_lat, home_lng, radius_m')
    .eq('id', user.id)
    .single()

  if (profile?.home_lat == null || profile?.home_lng == null) {
    redirect('/onboarding')
  }

  let postsQuery = supabase
    .from('posts')
    .select('id, type, text, status, created_at, author_id')
    .order('created_at', { ascending: false })

  if (type) {
    postsQuery = postsQuery.eq('type', type)
  }

  const { data: posts } = await postsQuery

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Лента</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{user.email ?? user.phone}</p>
          </div>
          <form action={signOut}>
            <button className="flex h-9 items-center rounded-md border border-black/10 px-4 text-sm text-black transition-transform duration-150 [transition-timing-function:var(--ease-out-strong)] active:scale-[0.97] dark:border-white/10 dark:text-zinc-50">
              Выйти
            </button>
          </form>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-2">
            <Link href="/feed" className={tabClass(!type)}>
              Все
            </Link>
            {TYPE_ORDER.map((t) => (
              <Link key={t} href={`/feed?type=${t}`} className={tabClass(type === t)}>
                {TYPE_LABELS[t]}
              </Link>
            ))}
          </nav>
          <RadiusFilter radiusM={profile?.radius_m ?? 800} type={type} />
        </div>

        <ul className="flex flex-col gap-3">
          {posts?.length ? (
            posts.map((post) => (
              <li
                key={post.id}
                className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_CLASS[post.type as PostType]}`}
                  >
                    {TYPE_LABELS[post.type as PostType]}
                  </span>
                  {post.author_id === user.id && post.status !== 'active' && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-500">
                      {STATUS_LABELS[post.status] ?? post.status}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-500">
                    {new Date(post.created_at).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm leading-6 text-black dark:text-zinc-50">{post.text}</p>
              </li>
            ))
          ) : (
            <li className="rounded-xl border border-dashed border-black/10 p-8 text-center text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-500">
              {type
                ? 'В этой категории пока нет постов в вашем радиусе.'
                : 'Пока нет постов в вашем радиусе — загляните позже.'}
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
