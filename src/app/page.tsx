import Link from 'next/link'
import {
  Binoculars,
  MagnifyingGlass,
  Megaphone,
  Warning,
  Wrench,
} from '@phosphor-icons/react/dist/ssr'
import type { Icon } from '@phosphor-icons/react'
import GuestLocationPicker from '@/components/GuestLocationPicker'

// Категории поста — те же 4 типа и те же иконки, что и на экране создания
// поста (new-post-form.tsx), чтобы плитка на главной была не просто
// рекламным текстом, а честным превью того, что реально есть в ленте —
// как категории на Avito ведут в реальные объявления, а не в абстрактные
// "фичи".
const CATEGORIES: { title: string; description: string; icon: Icon }[] = [
  {
    title: 'Объявления',
    description: 'Продать, отдать или предупредить о ремонте — соседи увидят и услышат.',
    icon: Megaphone,
  },
  {
    title: 'Находки',
    description: 'Потерялся кот или нашли ключи у подъезда — быстрее, чем в чатах дома.',
    icon: Binoculars,
  },
  {
    title: 'Услуги',
    description: 'Нужен сантехник или репетитор? Спросите у тех, кто живёт рядом.',
    icon: Wrench,
  },
  {
    title: 'ЧП',
    description: 'Прорвало трубу, отключили свет, подозрительно у подъезда — предупредите сразу.',
    icon: Warning,
  },
]

const STEPS = [
  {
    title: 'Найдите свой адрес или поставьте точку на карте',
    description:
      'Начните вводить адрес или район — как в поиске выше — либо кликните прямо на карте. Координаты нужны только для радиуса, адрес никто не увидит.',
  },
  {
    title: 'Мы определим ваш район',
    description: '132 района Москвы — точно по границам OSM, а не по почтовому индексу.',
  },
  {
    title: 'Смотрите ленту соседей',
    description: 'Только посты в выбранном радиусе — 500, 800 или 1000 метров от дома.',
  },
]

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-sm font-semibold tracking-tight text-black dark:text-zinc-50">
          Соседи
        </span>
        {/* Один-единственный вход в регистрацию на всей странице — тихая
            ссылка сбоку, без кнопки и без повторов ниже (по образцу Avito:
            анонимный просмотр по умолчанию, вход нужен только когда решил
            откликнуться/опубликовать). */}
        <Link
          href="/login"
          className="text-sm text-zinc-500 transition-colors hover:text-black dark:text-zinc-500 dark:hover:text-zinc-50"
        >
          Войти
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-20 px-6 pb-24 pt-8 sm:pt-12">
        {/* Hero + поиск — как на Avito: адрес/район выходят на первый план,
            а не прячутся внизу длинного маркетингового текста. Заголовок и
            подзаголовок короче, чем раньше, чтобы поиск оказался в первом
            экране на любом устройстве. */}
        <section className="flex flex-col items-start gap-5">
          <span
            className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-white/10 dark:text-zinc-400"
            style={{ animationDelay: '0ms' }}
          >
            <MagnifyingGlass size={12} weight="bold" aria-hidden="true" />
            Москва · 132 района
          </span>
          <h1
            className="animate-fade-up max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-black sm:text-4xl sm:leading-tight dark:text-zinc-50"
            style={{ animationDelay: '60ms' }}
          >
            Всё, что происходит рядом с вашим домом
          </h1>
          <p
            className="animate-fade-up max-w-lg text-base leading-7 text-zinc-600 dark:text-zinc-400"
            style={{ animationDelay: '120ms' }}
          >
            Найдите свой адрес или район ниже — покажем ленту соседей в радиусе, который
            выберете вы.
          </p>
          <div className="animate-fade-up w-full pt-1" style={{ animationDelay: '180ms' }}>
            <GuestLocationPicker />
          </div>
        </section>

        {/* Категории — плитки с иконками вместо текстовых карточек, как
            грид категорий на главной Avito, но в нашей чёрно-белой
            стилистике без чужих фирменных цветов. */}
        <section className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
            Что публикуют соседи
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CATEGORIES.map((category, i) => {
              const CategoryIcon = category.icon
              return (
                <div
                  key={category.title}
                  className="animate-fade-up flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-5 transition-transform duration-200 [transition-timing-function:var(--ease-out-strong)] hover:-translate-y-0.5 dark:border-white/10 dark:bg-zinc-950"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <span className="flex size-10 items-center justify-center rounded-lg bg-black/[.04] text-black dark:bg-white/[.08] dark:text-zinc-50">
                    <CategoryIcon size={20} weight="regular" aria-hidden="true" />
                  </span>
                  <h3 className="text-sm font-semibold text-black dark:text-zinc-50">
                    {category.title}
                  </h3>
                  <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {category.description}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="flex flex-col gap-10 scroll-mt-20">
          <h2 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Как это работает
          </h2>
          <ol className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-2">
                <span className="text-sm font-mono text-zinc-400 dark:text-zinc-600">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-base font-semibold text-black dark:text-zinc-50">
                  {step.title}
                </h3>
                <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 py-8">
        <p className="text-xs text-zinc-500 dark:text-zinc-500">Соседи · Москва · 2026</p>
      </footer>
    </div>
  )
}
