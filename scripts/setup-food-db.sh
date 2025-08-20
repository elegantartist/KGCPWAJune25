#!/bin/bash

# Run db:push to create tables
echo "Creating database tables..."
npm run db:push

# Run seed-food-db to populate tables
echo "Seeding food database..."
npx tsx scripts/seed-food-db.ts

echo "Food database setup complete!"