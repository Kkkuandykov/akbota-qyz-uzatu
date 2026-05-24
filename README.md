# Қыз Ұзату · Ақбота · 18.07.2026

Пригласительный сайт на той с приёмом RSVP и автоматической записью в Excel.

---

## 📁 Что добавить перед запуском

### 1. Фото невесты (3 шт) → `public/images/`
Сохраните фотографии с такими именами:
- `public/images/bride-1.jpg` — вертикальное (саукеле на стенде)
- `public/images/bride-2.jpg` — портрет с саукеле
- `public/images/bride-3.jpg` — момент возложения саукеле

Если фото не положить — сайт всё равно работает, просто покажутся стилизованные плейсхолдеры.

### 2. Музыка → `public/music/`
- `public/music/gashykpyn.mp3` — песня «Гашықпын» — Орынхан Танатар

Где взять mp3:
- YouTube → конвертер `y2mate.com` / `cobalt.tools`
- Yandex Music / Spotify → выгрузка через расширения
- Если файла нет — сайт работает без музыки, кнопка просто не запустит звук

### 3. (Опционально) превью для соцсетей
- `public/images/og.jpg` — картинка 1200×630 для WhatsApp / Telegram превью

---

## 🚀 Запуск локально

```bash
npm install
npm start
```

Сайт: http://localhost:3000
Админка (RSVP): http://localhost:3000/admin?key=akbota2026

---

## ☁️ Деплой на Railway

### Вариант А — через GitHub (рекомендую)
1. Создайте репозиторий на GitHub и запушьте все файлы:
   ```bash
   git init
   git add .
   git commit -m "Қыз Ұзату Ақбота — initial"
   git branch -M main
   git remote add origin <ваш-github-url>
   git push -u origin main
   ```
2. Зайдите на [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
3. Выберите репозиторий
4. В разделе **Variables** добавьте:
   - `ADMIN_KEY` = `придумайте_свой_секретный_ключ` (например `roza-kairat-2026`)
5. Дождитесь деплоя → Railway даст вам публичный URL (`https://что-то.up.railway.app`)
6. Откройте раздел **Settings → Networking → Generate Domain** чтобы получить ссылку
7. Готово! Эту ссылку отправляйте гостям.

### Вариант Б — через Railway CLI
```bash
npm i -g @railway/cli
railway login
railway init
railway up
railway variables set ADMIN_KEY=ваш_ключ
railway domain
```

### ⚠️ Важно про Excel и Railway
Railway по умолчанию НЕ хранит файлы между деплоями (контейнер пересоздаётся).
Чтобы данные RSVP не терялись:

1. В Railway откройте проект → **+ New → Volume**
2. Mount path: `/app/data`
3. Привяжите volume к сервису
4. Передеплойте

Теперь файл `data/rsvp.xlsx` будет сохраняться между перезапусками.

---

## 📊 Где смотреть ответы гостей

После деплоя:
- **Веб-интерфейс**: `https://ваш-домен.up.railway.app/admin?key=ВАШ_КЛЮЧ`
  - Статистика: всего / придут / не придут
  - Таблица всех ответов
  - Кнопка скачать Excel
- **Прямая ссылка на Excel**: `https://ваш-домен.up.railway.app/api/rsvp/download?key=ВАШ_КЛЮЧ`

Локально:
- Файл лежит в `data/rsvp.xlsx` — можно открыть прямо в Excel/Numbers.

---

## 🎨 Что можно подкрутить

| Что | Где |
|---|---|
| Дата/время мероприятия | `public/script.js` строка 9 (`EVENT_DATE`) и `public/index.html` |
| Имена хозяев тоя | `public/index.html` → `greeting-hosts` |
| Адрес и название места | `public/index.html` → секция `details` |
| Координаты карты | `public/index.html` → iframe в секции `map` |
| Цветовая палитра | `public/styles.css` → `:root` (--gold, --ink, etc.) |
| Текст приглашения | `public/index.html` → `.greeting-text` |
| Админ-ключ | переменная окружения `ADMIN_KEY` |

---

## 🗂 Структура проекта

```
.
├── server.js              # Express сервер + сохранение в Excel
├── package.json
├── railway.json           # конфиг для Railway
├── public/
│   ├── index.html         # главная страница
│   ├── admin.html         # админка RSVP
│   ├── styles.css         # все стили
│   ├── script.js          # countdown, музыка, форма
│   ├── images/            # фото невесты (положить сюда)
│   └── music/             # gashykpyn.mp3 (положить сюда)
└── data/
    └── rsvp.xlsx          # создастся автоматически после первого RSVP
```

---

## 🤍 Сделано с любовью для Ақбота
