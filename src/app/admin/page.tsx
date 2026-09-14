import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { banPost, dismissReport, confirmVerification, rejectVerification } from './actions'

const TYPE_LABELS: Record<string, string> = {
  announcement: 'Объявление',
  found: 'Находка',
  service: 'Услуга',
  emergency: 'ЧП',
}

const buttonClass =
  'flex h-8 items-center rounded-md px-3 text-xs font-medium transition-transform duration-150 [transition-timing-function:var(--ease-out-strong)] active:scale-[0.97]'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    redirect('/feed')
  }

  const { data: reportedPosts } = await supabase
    .from('posts')
    .select('id, type, text, created_at, author_id')
    .eq('status', 'under_review')
    .order('created_at', { ascending: false })

  const postIds = (reportedPosts ?? []).map((p) => p.id)
  const { data: reports } =
    postIds.length > 0
      ? await supabase
          .from('reports')
          .select('post_id, reason, created_at')
          .in('post_id', postIds)
      : { data: [] }

  const reportsByPost = new Map<string, { reason: string | null; created_at: string }[]>()
  for (const r of reports ?? []) {
    const list = reportsByPost.get(r.post_id) ?? []
    list.push({ reason: r.reason, created_at: r.created_at })
    reportsByPost.set(r.post_id, list)
  }

  const { data: pendingVerifications } = await supabase
    .from('users')
    .select('id, email, verification_photo_path')
    .not('verification_photo_path', 'is', null)
    .eq('is_verified', false)
    .order('updated_at', { ascending: true })

  const verificationsWithUrls = await Promise.all(
    (pendingVerifications ?? []).map(async (v) => {
      const { data: signed } = await supabase.storage
        .from('verification-photos')
        .createSignedUrl(v.verification_photo_path as string, 600)
      return { ...v, photoUrl: signed?.signedUrl ?? null }
    })
  )

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Админка</h1>
        <Link
          href="/feed"
          className="text-sm text-zinc-500 transition-colors hover:text-black dark:text-zinc-500 dark:hover:text-zinc-50"
        >
          ← Лента
        </Link>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
          Жалобы {reportedPosts?.length ? `(${reportedPosts.length})` : ''}
        </h2>

        {!reportedPosts?.length && (
          <p className="rounded-xl border border-dashed border-black/10 p-6 text-center text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-500">
            Жалоб нет.
          </p>
        )}

        {reportedPosts?.map((post) => {
          const postReports = reportsByPost.get(post.id) ?? []
          const reasons = postReports.map((r) => r.reason).filter(Boolean)
          return (
            <div
              key={post.id}
              className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
            >
              <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {TYPE_LABELS[post.type] ?? post.type}
                </span>
                <span>
                  {postReports.length}{' '}
                  {postReports.length === 1 ? 'жалоба' : 'жалоб(ы)'}
                </span>
              </div>
              <p className="mb-3 text-sm leading-6 text-black dark:text-zinc-50">{post.text}</p>
              {reasons.length > 0 && (
                <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-500">
                  Причины: {reasons.join('; ')}
                </p>
              )}
              <div className="flex gap-2">
                <form action={dismissReport}>
                  <input type="hidden" name="post_id" value={post.id} />
                  <button
                    type="submit"
                    className={`${buttonClass} border border-black/10 text-black dark:border-white/10 dark:text-zinc-50`}
                  >
                    Снять жалобу
                  </button>
                </form>
                <form action={banPost}>
                  <input type="hidden" name="post_id" value={post.id} />
                  <button
                    type="submit"
                    className={`${buttonClass} bg-red-600 text-white hover:bg-red-700`}
                  >
                    Забанить пост
                  </button>
                </form>
              </div>
            </div>
          )
        })}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
          Верификация жителей{' '}
          {verificationsWithUrls.length ? `(${verificationsWithUrls.length})` : ''}
        </h2>

        {!verificationsWithUrls.length && (
          <p className="rounded-xl border border-dashed border-black/10 p-6 text-center text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-500">
            Заявок на проверке нет.
          </p>
        )}

        {verificationsWithUrls.map((v) => (
          <div
            key={v.id}
            className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
          >
            <p className="mb-3 text-sm text-black dark:text-zinc-50">{v.email}</p>
            {v.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- подписанный URL из приватного бакета, next/image тут не даёт преимуществ
              <img
                src={v.photoUrl}
                alt="Скриншот квитанции"
                className="mb-3 max-h-96 w-full rounded-lg border border-black/10 object-contain dark:border-white/10"
              />
            )}
            <div className="flex gap-2">
              <form action={rejectVerification}>
                <input type="hidden" name="user_id" value={v.id} />
                <button
                  type="submit"
                  className={`${buttonClass} border border-black/10 text-black dark:border-white/10 dark:text-zinc-50`}
                >
                  Отклонить
                </button>
              </form>
              <form action={confirmVerification}>
                <input type="hidden" name="user_id" value={v.id} />
                <button
                  type="submit"
                  className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
                >
                  Подтвердить
                </button>
              </form>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
