Deployment notes — lumotarina_v3
================================

Objective
---------
Prepare the project to be built and deployed on a remote server under:

- Frontend: https://dnd.lumotarina.ru
- Backend:  https://api-dnd.lumotarina.ru

I provide a `docker-compose.prod.yml` that uses `nginx` as a reverse-proxy and `certbot` for Let's Encrypt certificate issuance.

Quick checklist before deploying
---------------------------------
1. Add DNS records:
   - `dnd.lumotarina.ru` → your server IP
   - `api-dnd.lumotarina.ru` → your server IP

2. Copy service account JSON for Firebase to server and make it available to backend container.
   - Option A (recommended): put file at `/srv/lumotarina_v3/secrets/firebase_sa.json` and mount it into the backend container, then set `GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/firebase_sa.json` (see notes below).
   - Option B: keep secrets in an env-file on the host at `/secrets/lumotarina/.env` (one-line `KEY=VALUE` pairs). `docker-compose.prod.yml` can load that file via `env_file` and the backend image will construct the `firebase_sa.json` automatically from env vars.
   - Option B: export `GOOGLE_APPLICATION_CREDENTIALS_JSON` env var with the JSON (less recommended).

3. Edit `docker-compose.prod.yml`:
   - Set your email in the README or when you run certbot (used by Let's Encrypt notifications).
   - Optionally change `restart` or resource limits.

4. Prepare runtime config (optional):
   - If you want to change API base URL without rebuilding the frontend, create `runtime/config.js` with content like:

```js
window.__RUNTIME__ = {
  VITE_API_BASE: 'https://api-dnd.lumotarina.ru'
};
```

   - The compose file mounts `./runtime/config.js` to the frontend site root so the app can read it at runtime.

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

Notes about environment and secrets
----------------------------------
- Backend needs Firebase admin credentials. Two common approaches:
   1) Mount the service-account JSON as a file into the container and set `GOOGLE_APPLICATION_CREDENTIALS` to its path.
     Example (compose secrets or bind mount):
       volumes:
         - /srv/lumotarina_v3/secrets/firebase_sa.json:/run/secrets/firebase_sa.json:ro
       environment:
         - GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/firebase_sa.json

   2) Or place your secrets in a host `.env` file (recommended path: `/secrets/lumotarina/.env`) with variables such as `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_PRIVATE_KEY_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_CLIENT_ID`, `FIREBASE_CLIENT_X509_URL`. `docker-compose.prod.yml` loads this file into the backend container and the image entrypoint creates `firebase_sa.json` automatically.

  2) Pass JSON as an env var (not ideal for long secrets). If you use this, update the backend to read `process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON`.

- Frontend: `VITE_API_BASE` is baked at build time (see `docker-compose.prod.yml` build-arg). If you need to change it, rebuild the frontend.

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
`docker compose -f docker-compose.prod.yml build --no-cache frontend`
`docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate frontend`

# build both images
`docker compose -f docker-compose.prod.yml build backend frontend`
`docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend`

Single-command (rebuild-and-up)
# This rebuilds images and recreates containers
docker compose -f docker-compose.prod.yml up -d --build --force-recreate backend frontend
---
Best practice for production is to build images in CI, push to registry, then on server:

`docker compose -f docker-compose.prod.yml pull`
`docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend`
This avoids heavy builds on your server.
