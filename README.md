# GBC Analytics Dashboard

Мини-дашборд аналитики заказов. RetailCRM + Supabase + Next.js + Telegram Bot.

## Архитектура

```
RetailCRM (заказы) --> скрипт синхронизации --> Supabase (база данных)
                                                    |
                                               Next.js Дашборд (Vercel)
                                                    |
                                               Telegram Бот (алерты > 50K KZT)
```

## Быстрый старт

### Требования
- Python 3.10+
- Node.js 18+
- Аккаунты: RetailCRM (демо), Supabase, Vercel, Telegram Bot

### Шаг 0: Настройка окружения

1. Скопируйте `.env.example` в `.env`
2. Заполните все значения в `.env`

### Шаг 1: Создание таблицы в Supabase

1. Зайдите в Supabase проект > SQL Editor
2. Вставьте и выполните содержимое `supabase_schema.sql`

### Шаг 2: Загрузка заказов в RetailCRM

```bash
cd scripts
pip install -r requirements.txt
python upload_to_retailcrm.py
```

### Шаг 3: Синхронизация RetailCRM в Supabase

```bash
python sync_retailcrm_to_supabase.py
```

Или для быстрого тестирования (напрямую в Supabase):

```bash
python load_mock_to_supabase.py
```

### Шаг 4: Деплой дашборда на Vercel

```bash
cd dashboard
npm install
npm run dev
```

Для Vercel: запушить на GitHub, импортировать в Vercel, добавить env vars, задеплоить.

### Шаг 5: Запуск Telegram бота

```bash
cd scripts
python telegram_bot.py
```

## Какие промпты давал AI-ассистенту (Kilo Code)

### Промпт 1: Каркас проекта
> "Построй полный проект мини-дашборда: Python-скрипты для загрузки mock_orders.json в RetailCRM API, синхронизация в Supabase, Next.js дашборд с Recharts, Telegram бот для заказов > 50K KZT. TypeScript, темная тема, деплой на Vercel."

### Промпт 2: Схема Supabase
> "Создай SQL-схему для таблицы orders в Supabase: retailcrm_id, поля клиента, total_amount, items JSONB, utm_source. Добавь RLS-политики для публичного чтения и записи через service role."

### Промпт 3: Дизайн дашборда
> "Сделай страницу дашборда с KPI-карточками, area-графиком заказов по датам, donut-диаграммой городов, bar-графиками выручки и UTM-источников, горизонтальным баром топ-товаров. Recharts, темная тема."

### Промпт 4: Улучшение дизайна
> "Улучши дизайн: glassmorphism-карточки, градиентные заливки, лучшая типографика, профессиональный вид без эмодзи."

### Промпт 5: Локализация
> "Переведи все надписи на русский язык, т.к. задание на русском."

### Промпт 6: Telegram бот
> "Создай Telegram бота, который мониторит Supabase на заказы > 50 000 KZT, отправляет HTML-алерты с данными клиента, автоопределение chat_id."

## Где застрял и как решил

1. **DNS/Сетевые проблемы**: Рабочая машина не резолвила домены supabase.co и retailcrm.ru. Решение: загрузил данные через SQL Editor в браузере, Telegram-сообщения отправлял через прямые API-вызовы.

2. **Формат ключей Supabase**: Новый формат `sb_publishable_` / `sb_secret_` вместо JWT `eyJ...`. Клиент supabase-js принял их, но REST root endpoint требовал secret key. Решение: использовал publishable key для дашборда (работает для запросов к таблицам).

3. **Опечатка в URL Supabase**: Неправильно извлек project ref из URL дашборда (`quiqmhntwotmslcqwgtv` вместо правильного `qusjmhntwotmslcgwgtv`). Потратил значительное время на дебаг. Решение: nslookup подтвердил правильный hostname.

4. **Ошибка prerender в Next.js**: Билд падал из-за пустого URL Supabase на этапе сборки. Решение: добавил placeholder URL в инициализацию клиента.

5. **Обрезка путей файлов**: Рабочая директория с кириллицей вызывала обрезку длинных путей при создании файлов. Решение: использовал Python-скрипты для генерации файлов.

## Стек технологий

Python, Next.js 14, TypeScript, Recharts, Supabase, RetailCRM API v5, Telegram Bot API, Vercel
