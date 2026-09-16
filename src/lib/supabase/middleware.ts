import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: avoid writing logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard
  // to debug issues with users being randomly logged out.
  // Refreshing the session token as a side effect — result intentionally unused here.
  try {
    await supabase.auth.getUser()
  } catch {
    // Протухший или уже использованный refresh token (частое дело при
    // многократном тестировании через magic link) — supabase-js в этом
    // случае не возвращает { error }, а бросает AuthApiError прямо из
    // getUser(). Без этого catch ошибка улетала бы дальше в рендер
    // серверных компонентов и валила всю страницу (React error #441),
    // хотя по сути это просто "пользователь разлогинен". scope: 'local'
    // ничего не шлёт на сервер (там и так уже нечего подтверждать) —
    // только чистит битые cookies, чтобы страница отрендерилась как
    // для гостя, а не упала.
    await supabase.auth.signOut({ scope: 'local' })
  }

  return supabaseResponse
}
