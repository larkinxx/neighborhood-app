import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/feed'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // За реверс-прокси Timeweb "origin" из самого запроса иногда
      // оказывается внутренним адресом контейнера (например, localhost),
      // а не публичным доменом — прокси не всегда переписывает Host.
      // x-forwarded-host — стандартный заголовок, который прокси
      // проставляет с реальным адресом, с которого пришёл пользователь;
      // это официально документированный Supabase способ обхода именно
      // этой проблемы для Next.js за балансировщиком/прокси.
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        // Локальная разработка без прокси — origin уже верный.
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
