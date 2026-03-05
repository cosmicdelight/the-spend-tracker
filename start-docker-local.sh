#!/bin/bash
set -e

# Make sure Docker is running before proceeding
if ! docker info >/dev/null 2>&1; then
    echo "Docker does not appear to be running. Please start Docker first."
    exit 1
fi

echo "========================================="
echo "1. Starting Local Supabase Backend"
echo "========================================="
# Check if supabase CLI is available. If not, run via npx
if command -v supabase &> /dev/null; then
    supabase start
    # Extract keys
    export VITE_SUPABASE_URL=$(supabase status -o json | grep '"api_url"' | awk -F'"' '{print $4}')
    export VITE_SUPABASE_PUBLISHABLE_KEY=$(supabase status -o json | grep '"anon_key"' | awk -F'"' '{print $4}')
else
    npx supabase start
    export VITE_SUPABASE_URL=$(npx supabase status -o json | grep '"api_url"' | awk -F'"' '{print $4}')
    export VITE_SUPABASE_PUBLISHABLE_KEY=$(npx supabase status -o json | grep '"anon_key"' | awk -F'"' '{print $4}')
fi

if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
    echo "Failed to retrieve local Supabase credentials."
    exit 1
fi

echo ""
echo "Retrieved Local Credentials:"
echo "VITE_SUPABASE_URL=$VITE_SUPABASE_URL"
echo "VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY:0:15}..."

echo ""
echo "========================================="
echo "2. Building & Starting Frontend Container"
echo "========================================="
docker-compose up -d --build

if [ -f "scripts/seed-local.js" ]; then
    echo "========================================="
    echo "3. Seeding Data"
    echo "========================================="
    # Extract service role key for the node script
    if command -v supabase &> /dev/null; then
        export SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o json | grep '"service_role_key"' | awk -F'"' '{print $4}')
    else
        export SUPABASE_SERVICE_ROLE_KEY=$(npx supabase status -o json | grep '"service_role_key"' | awk -F'"' '{print $4}')
    fi
    node scripts/seed-local.js
fi

echo ""
echo "========================================="
echo "4. All set! The application is running."
echo "Frontend: http://localhost:8080"
echo "Backend Studio: http://localhost:54323 (default Supabase local studio)"
echo "To stop: npx supabase stop && docker-compose down"
echo "========================================="
