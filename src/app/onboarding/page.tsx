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

  const { data: profile } = await supabase
    .from('users')
    .select('home_lat, home_lng')
    .eq('id', user.id)
    .single()

  if (profile?.home_lat != null && profile?.home_lng != null) {
    redirect('/feed')
  }

  return <OnboardingForm />
}
