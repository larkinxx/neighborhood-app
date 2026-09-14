import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Timeweb Cloud App Platform (реверс-прокси перед приложением) не всегда
  // прокидывает публичный домен в x-forwarded-host — из-за этого Next.js
  // сравнивает Origin запроса (https://sosed-ru.ru) с внутренним хостом
  // (вроде localhost) и считает Server Action подозрительным (CSRF-защита),
  // молча отклоняя его. Та же причина, что и в баге с редиректом на
  // localhost при входе по почте (см. src/app/auth/callback/route.ts) —
  // там прокси-заголовки, здесь — сверка происхождения самих Server Actions.
  experimental: {
    serverActions: {
      allowedOrigins: ["sosed-ru.ru", "*.sosed-ru.ru"],
    },
  },
};

export default nextConfig;
