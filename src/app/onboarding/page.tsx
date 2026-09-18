import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingForm from './onboarding-form'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('home_lat, home_lng')
    .eq('id', user.id)
    .single()

  if (profile?.home_lat != null && profile?.home_lng != null) {
    redirect('/feed')
  }

  return (
    <>
      {/* ВРЕМЕННЫЙ диагностический блок для бага "Cannot coerce the
          result to a single JSON object" при сохранении адреса. Если
          profile === null уже здесь, ДО какой-либо попытки сохранения —
          значит строки в public.users для этого пользователя нет вообще
          (не сработал handle_new_user при регистрации), а не проблема
          в самом update. Убрать этот блок, когда причина найдена. */}
      {!profile && (
        <p className="mx-auto max-w-xl px-6 pt-4 text-xs text-amber-600 dark:text-amber-400">
          [диагностика] профиль не найден в public.users: user.id={user.id},
          email={user.email}, ошибка select: {profileError?.message ?? 'нет (пустой результат)'}
        </p>
      )}
      <OnboardingForm />
    </>
  )
}
