#!/bin/sh
set -e

# If a service account file already exists (mounted), prefer it
SA_PATH=/run/secrets/firebase_sa.json
if [ -f "$SA_PATH" ]; then
  echo "Using existing firebase service account file at $SA_PATH"
else
  # Try to construct from environment variables (loaded via env_file)
  if [ -n "$FIREBASE_PRIVATE_KEY" ] || [ -n "$GOOGLE_APPLICATION_CREDENTIALS_JSON" ]; then
    echo "Creating firebase service account file from environment variables"
    if [ -n "$GOOGLE_APPLICATION_CREDENTIALS_JSON" ]; then
      echo "$GOOGLE_APPLICATION_CREDENTIALS_JSON" > "$SA_PATH"
    else
      # Replace literal \n sequences with real newlines
      PK=$(printf '%b' "$FIREBASE_PRIVATE_KEY")
      cat > "$SA_PATH" <<EOF
{
  "type": "service_account",
  "project_id": "${FIREBASE_PROJECT_ID}",
  "private_key_id": "${FIREBASE_PRIVATE_KEY_ID}",
  "private_key": "${PK}",
  "client_email": "${FIREBASE_CLIENT_EMAIL}",
  "client_id": "${FIREBASE_CLIENT_ID}",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "${FIREBASE_CLIENT_X509_URL}"
}
EOF
    fi
    chmod 600 "$SA_PATH" || true
  else
    echo "No firebase service account provided (neither mounted file nor env vars). Proceeding without service account file."
  fi
fi

# Set GOOGLE_APPLICATION_CREDENTIALS if the file exists and var is not set
if [ -f "$SA_PATH" ] && [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  export GOOGLE_APPLICATION_CREDENTIALS="$SA_PATH"
fi

exec "$@"
