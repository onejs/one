#!/bin/bash

# Load .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
else
  echo ".env file not found!"
  exit 1
fi

# Parse the DATABASE_URL
if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL not set in .env file!"
  exit 1
fi

# Extract components from the DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's|.*://\([^:]*\):.*@\([^:]*\).*|\1|p')
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's|.*://[^@]*@\([^:/]*\)[:/].*|\1|p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's|.*://[^@]*@[^:]*:\([^/]*\).*|\1|p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's|.*://[^@]*@[^:/]*[:0-9]*/\([^?]*\).*|\1|p')

if [[ -z "$DB_USER" || -z "$DB_PASSWORD" || -z "$DB_NAME" ]]; then
  echo "Error parsing DATABASE_URL."
  exit 1
fi

# Check if user already exists
USER_EXISTS=$(psql postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")
if [[ $USER_EXISTS == "1" ]]; then
  echo "User '$DB_USER' already exists. Exiting..."
  exit 0
fi

# Check if database already exists
DB_EXISTS=$(psql postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")
if [[ $DB_EXISTS == "1" ]]; then
  echo "Database '$DB_NAME' already exists. Exiting..."
  exit 0
fi

# Create the user
psql postgres -c "CREATE USER \"$DB_USER\" WITH PASSWORD '$DB_PASSWORD';"

# Create the database with the user as owner
psql postgres -c "CREATE DATABASE $DB_NAME OWNER \"$DB_USER\";"

# Grant all privileges on the database to the user
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO \"$DB_USER\";"

echo "Database '$DB_NAME' with user '$DB_USER' created successfully."
