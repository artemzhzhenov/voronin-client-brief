# VORONIN Client Brief

Пошаговый клиентский опросник для сбора коммерческой информации и подготовки knowledge base для AI-системы проекта «Воронин».

## Что внутри

- 7-шаговый wizard-интерфейс;
- адаптивная верстка для телефона и компьютера;
- автосохранение черновика в браузере;
- обязательные поля и простая валидация;
- динамические карточки товаров;
- загрузка/выбор материалов;
- экспорт заполненного брифа в JSON;
- опциональная отправка в n8n / Make / Formspree через webhook;
- отдельный блок правил, запрещающих AI выдумывать цену, наличие, сроки и характеристики.

## Быстрый запуск локально

Просто откройте `index.html` в браузере.

Для более корректной работы можно запустить локальный сервер:

```bash
python3 -m http.server 8080
```

После этого открыть: `http://localhost:8080`

## Публикация на GitHub Pages

1. Создайте новый GitHub-репозиторий, например `voronin-client-brief`.
2. Загрузите в корень репозитория файлы:
   - `index.html`
   - `styles.css`
   - `app.js`
3. В GitHub откройте **Settings → Pages**.
4. В разделе **Build and deployment** выберите:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
5. Сохраните настройки.
6. GitHub выдаст публичную ссылку вида `https://username.github.io/voronin-client-brief/`.

## Как включить настоящую отправку данных

В файле `app.js` в самом начале есть настройка:

```js
const CONFIG = {
  webhookUrl: "",
  ...
};
```

В `webhookUrl` можно вставить URL вебхука из:

- n8n;
- Make;
- Formspree;
- собственного backend/API.

При заполненном `webhookUrl` сайт отправляет `multipart/form-data`:

- поле `payload` — JSON со всеми ответами;
- поля `files` — выбранные клиентом файлы.

Если webhook не задан, сайт автоматически скачивает JSON с ответами.

## Рекомендуемая схема для проекта «Воронин»

GitHub Pages → n8n Webhook → Google Drive / S3 для файлов → Airtable / PostgreSQL / Notion / CRM → нормализация → Knowledge Base → AI-агенты.

### Рекомендуемые технические поля в базе знаний

Для коммерчески критичных данных хранить вместе с каждым значением:

- `value`
- `source`
- `verified`
- `verified_by`
- `last_updated`
- `requires_manager_confirmation`

Например:

```json
{
  "price_rule": {
    "value": "Рассчитывается менеджером по объёму и плотности",
    "source": "client_brief",
    "verified": true,
    "last_updated": "2026-09-05",
    "requires_manager_confirmation": true
  }
}
```

## Важно

GitHub Pages — статический хостинг. Он сам по себе не хранит ответы клиентов на сервере. Для централизованного сбора заполненных анкет нужен webhook/backend. До его подключения безопасный fallback — скачивание JSON-файла.
