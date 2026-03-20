README: Восстановление Let's Encrypt сертификатов для проекта Lumotarina_v3

Кратко:
- Проблема: в корне проекта отсутствует папка `letsencrypt`, поэтому Nginx в проде монтирует пустую директорию и не видит сертификатов.
- Решение: создать/восстановить папку `letsencrypt`, запустить certbot (webroot) через Docker Compose для получения сертификатов, перезапустить `nginx-proxy`.

Требования:
- Docker и Docker Compose (выполняется на хосте с публичными IP).
- Домены `dnd.lumotarina.ru` и `api-dnd.lumotarina.ru` должны указывать на IP сервера.
- Порты 80 и 443 должны быть открыты и проксироваться на этот хост.

Шаги восстановления (выполнять из корня репозитория):

1) Проверка сети и DNS

	- Убедитесь, что домены резолвятся и порты открыты:

```bash
# проверить резолв
dig +short dnd.lumotarina.ru
dig +short api-dnd.lumotarina.ru

# проверить доступность портов (на хосте или удалённо)
curl -I http://dnd.lumotarina.ru
curl -I http://api-dnd.lumotarina.ru
```

2) Создать директорию для сертификатов (если отсутствует)

```bash
mkdir -p letsencrypt
mkdir -p certbot-www
```

3) Создать сеть Docker `web`, если её нет (prod compose ожидает external network `web`)

```bash
docker network inspect web >/dev/null 2>&1 || docker network create web
```

4) Запустить certbot через docker-compose для получения сертификатов (замените email на ваш)

```bash
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
	--webroot --webroot-path=/var/www/certbot \
	-d dnd.lumotarina.ru -d api-dnd.lumotarina.ru \
	--email you@example.com --agree-tos --no-eff-email
```

Пояснение: команда использует `certbot` контейнер и сохраняет сертификаты в смонтированную папку `./letsencrypt`.

5) Запустить/перезапустить `nginx-proxy`, чтобы он подхватил новые сертификаты

```bash
docker compose -f docker-compose.prod.yml up -d nginx-proxy
```

6) Проверка

 - Убедитесь, что файлы сертификатов появились: `./letsencrypt/live/dnd.lumotarina.ru/` и `./letsencrypt/live/api-dnd.lumotarina.ru/`.
 - Откройте браузер https://dnd.lumotarina.ru и https://api-dnd.lumotarina.ru

Дополнительно: автоматическое обновление

- Для автоматического renew обычно настраивают cron/таймер, или периодически вызывают команду renew в контейнере:

```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew --webroot --webroot-path=/var/www/certbot
```

Если вы видите ошибки:
- 401/403 при попытке получить ACME challenge — проверьте, что Nginx обслуживает `/.well-known/acme-challenge/` и `certbot-www` смонтирован.
- Ошибка порта/таймаута — проверьте firewall/ISP блокировку портов 80/443.
- DNS не совпадает — проверьте, что A/AAAA-записи указывают на сервер.

Контекст (файлы, которые я проверял):
- infra/nginx/proxy.conf — проброшены пути к сертификатам `/etc/letsencrypt/live/...` и `/.well-known/acme-challenge/`.
- docker-compose.prod.yml — монтирует `./letsencrypt` и `./certbot-www` в контейнеры.

Если хочешь, могу:
- сгенерировать и выполнить точные команды на этой машине (если у тебя есть права Docker), или
- подготовить скрипт автоматического renew + systemd timer для сервера.

Автор инструкции: Copilot (интерактивно сформировано по состоянию репозитория)

