#!/usr/bin/env bash
set -e
# Build images locally (change to 'backend frontend' as needed)
docker compose -f docker-compose.prod.yml build backend frontend
# Restart services with newly built images
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend frontend
# Recreate proxy (only needed if you changed proxy config or certs)
# docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate nginx-proxy

echo "Deployed at $(date)"