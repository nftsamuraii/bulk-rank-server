# BULK Rank Server

Node.js сервер який конвертує WebM → MP4 (H.264, bt709) через ffmpeg.

## Вимоги

- Node.js 18+
- ffmpeg встановлений в системі

## Встановлення ffmpeg

**Mac:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt install ffmpeg
```

**Windows:**
Завантажте з https://ffmpeg.org/download.html і додайте в PATH.

## Запуск

```bash
npm install
npm start
```

Відкрийте http://localhost:3000

## Деплой на Railway (безкоштовно)

1. Зареєструйтесь на https://railway.app
2. New Project → Deploy from GitHub
3. Завантажте цю папку в GitHub репозиторій
4. Railway автоматично визначить Node.js і встановить ffmpeg

## Деплой на Render (безкоштовно)

1. https://render.com → New Web Service
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Render має ffmpeg вбудований
