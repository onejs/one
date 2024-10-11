## Database Setup

Ensure `DATABASE_URL` set in a .env file and points to a Postgres database.

Then you:

```bash
yarn orm:generate
yarn orm:push
yarn org:seed
```
