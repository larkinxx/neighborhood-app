'use client'

import { useRouter } from 'next/navigation'

export default function DistrictFilter({
  districts,
  districtId,
  type,
}: {
  districts: { id: string; name: string }[]
  districtId?: string
  type?: string
}) {
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams()
    if (e.target.value) params.set('district', e.target.value)
    if (type) params.set('type', type)
    const query = params.toString()
    router.push(query ? `/feed?${query}` : '/feed')
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="district" className="text-sm text-zinc-600 dark:text-zinc-400">
        Район
      </label>
      <select
        id="district"
        defaultValue={districtId ?? ''}
        onChange={handleChange}
        className="max-w-[220px] rounded-md border border-black/10 bg-white px-2 py-1.5 text-sm text-black transition-transform duration-150 [transition-timing-function:var(--ease-out-strong)] active:scale-[0.97] dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50"
      >
        <option value="">Выберите район…</option>
        {districts.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
    </div>
  )
}
