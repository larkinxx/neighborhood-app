import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Соседи — соседское приложение для вашего района",
  description:
    "Объявления, находки, услуги и срочные оповещения от соседей в радиусе вашего дома.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
        {/* Единый декоративный фон для всего сайта (только тёмная тема) —
            мягкое свечение сверху + едва заметная сетка, исчезающая книзу.
            position:fixed, чтобы не требовать overflow-hidden на body
            (иначе ломается скролл длинных страниц) и не дублироваться
            на каждой странице по отдельности. */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 hidden dark:block dark:[background:radial-gradient(ellipse_70%_55%_at_50%_-10%,rgba(139,139,220,0.28),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 hidden dark:block dark:opacity-70 [background-image:linear-gradient(to_right,rgba(180,180,200,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(180,180,200,0.14)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_65%_50%_at_50%_-10%,black,transparent_75%)]"
        />
        {children}
      </body>
    </html>
  );
}
