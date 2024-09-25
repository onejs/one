## Database Setup

Ensure `DATABASE_URL` set in a .env file and points to a Postgres database.

Then you:

```bash
yarn db:init
```

TODO:

- seems this line isnt running in migrations i had to connect with psql and run manually:

```
SELECT
    *
FROM
    pg_create_logical_replication_slot('zero_slot_r1', 'pgoutput');

VACUUM;
```
