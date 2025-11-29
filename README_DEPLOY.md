Deployment notes — lumotarina_v3
================================

--- 

5. Build & run (example):
   - On the server, install Docker and Docker Compose.
   - From repository root:

```powershell
# Build and start services
docker compose -f docker-compose.prod.yml up -d --build
```

6. Obtain TLS certificates with certbot (one-time; ensures ACME challenge files are present and nginx serves them):

```powershell
# Ensure nginx is up and serving on port 80 (it will proxy to containers)
docker compose -f docker-compose.prod.yml up -d nginx-proxy

# Run certbot (example for both domains)
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot --webroot-path=/var/www/certbot \
  -d dnd.lumotarina.ru -d api-dnd.lumotarina.ru --email you@example.com --agree-tos --no-eff-email

# After successful issuance, restart nginx to pick up certs
docker compose -f docker-compose.prod.yml restart nginx-proxy
```
///
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot --webroot-path=/var/www/certbot \
  -d quist.lumotarina.ru -d api-quist.lumotarina.ru --email ligez47@gmail.com --agree-tos --no-eff-email

Traefik notes
-------------
- Traefik is configured to use the Docker provider and ACME TLS challenge; it mounts the docker socket to discover containers and automatically obtains certificates via TLS challenge. If you prefer not to mount the socket, you can use a static nginx reverse proxy and Certbot instead — I can provide examples.

Alternative: nginx + certbot
----------------------------
If you prefer nginx+certbot instead of Traefik, I can add a `nginx-proxy` pattern and certbot container with webroot or standalone challenge. Traefik simplifies automating cert issuance.

Next steps I can do for you
---------------------------
- Add Compose secrets for Firebase and show exact mount lines.
- Add systemd unit or script to auto-update & restart containers.
- Replace Traefik with nginx+certbot if you prefer that flow.


How to update
---------------------------
Na kolenke send `rsync -avz .` 
Reload Example:
- `docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend`
- `docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate nginx-proxy`
Rebuild Example:
# from /lumotarina
`docker compose -f docker-compose.prod.yml build frontend`
`docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate frontend`
If you want to build fresh ignoring cache:
``
`docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate frontend`

# build both images
`docker compose -f docker-compose.prod.yml build backend frontend`
`docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend nginx-proxy`

Single-command (rebuild-and-up)
# This rebuilds images and recreates containers
docker compose -f docker-compose.prod.yml up -d --build --force-recreate backend frontend
---
Best practice for production is to build images in CI, push to registry, then on server:

`docker compose -f docker-compose.prod.yml pull`
`docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend`
This avoids heavy builds on your server.
