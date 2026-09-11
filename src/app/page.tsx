import Link from 'next/link'
import GuestLocationPicker from '@/components/GuestLocationPicker'

const FEATURES = [
  {
    title: 'Объявления',
    description: 'Продать, отдать или предупредить о ремонте — соседи увидят и услышат.',
  },
  {
    title: 'Находки',
    description: 'Потерялся кот или нашли ключи у подъезда — быстрее, чем в чатах дома.',
  },
  {
    title: 'Услуги',
    description: 'Нужен сантехник или репетитор? Спросите у тех, кто живёт рядом.',
  },
  {
    title: 'ЧП',
    description: 'Прорвало трубу, отключили свет, подозрительно у подъезда — предупредите сразу.',
  },
]

const STEPS = [
  {
    title: 'Поставьте точку на карте',
    description:
      'Отметьте свой дом кликом — координаты нужны только для радиуса, адрес никто не увидит.',
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
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
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

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-24 px-6 pb-24 pt-12 sm:pt-20">
        {/* Hero */}
        <section className="flex flex-col items-start gap-6">
          <span
            className="animate-fade-up rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-white/10 dark:text-zinc-400"
            style={{ animationDelay: '0ms' }}
          >
            Москва · 132 района
          </span>
          <h1
            className="animate-fade-up max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-black sm:text-5xl sm:leading-tight dark:text-zinc-50"
            style={{ animationDelay: '60ms' }}
          >
            Всё, что происходит рядом с вашим домом
          </h1>
          <p
            className="animate-fade-up max-w-lg text-lg leading-8 text-zinc-600 dark:text-zinc-400"
            style={{ animationDelay: '120ms' }}
          >
            Объявления, находки, услуги и срочные оповещения от соседей — в радиусе,
            который выбираете вы. Никакого шума с другого конца города.
          </p>
          <div className="animate-fade-up w-full pt-2" style={{ animationDelay: '180ms' }}>
            <GuestLocationPicker />
          </div>
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className="animate-fade-up rounded-xl border border-black/10 bg-white p-5 transition-transform duration-200 [transition-timing-function:var(--ease-out-strong)] hover:-translate-y-0.5 dark:border-white/10 dark:bg-zinc-950"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <h3 className="mb-1.5 text-sm font-semibold text-black dark:text-zinc-50">
                {feature.title}
              </h3>
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {feature.description}
              </p>
            </div>
          ))}
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
