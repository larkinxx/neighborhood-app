'use client'

import { updateRadius } from '@/app/feed/actions'

const RADIUS_OPTIONS = [500, 800, 1000] as const

export default function RadiusFilter({
  radiusM,
  type,
}: {
  radiusM: number
  type?: string
}) {
  return (
    <form action={updateRadius} className="flex items-center gap-2">
      <input type="hidden" name="type" value={type ?? ''} />
      <label htmlFor="radius_m" className="text-sm text-zinc-600 dark:text-zinc-400">
        Радиус
      </label>
      <select
        id="radius_m"
        name="radius_m"
        defaultValue={radiusM}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-black/10 bg-white px-2 py-1.5 text-sm text-black transition-transform duration-150 [transition-timing-function:var(--ease-out-strong)] active:scale-[0.97] dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50"
      >
        {RADIUS_OPTIONS.map((m) => (
          <option key={m} value={m}>
            {m} м
          </option>
        ))}
      </select>
    </form>
  )
}
