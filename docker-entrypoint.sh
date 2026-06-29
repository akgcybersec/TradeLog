#!/bin/sh
set -e

mkdir -p /data /app/public/uploads

echo "Applying database schema..."
npx prisma db push

exec "$@"
