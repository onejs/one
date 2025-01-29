#!/usr/bin/env bun

import { Resource } from 'sst'

console.info(`what is`, Resource.Postgres)

Bun.spawnSync([`psql`], {
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
  env: {
    ...process.env,
    PGPASSWORD: Resource.Postgres.password,
    PGUSER: Resource.Postgres.username,
    PGHOST: Resource.Postgres.host,
    PGDATABASE: Resource.Postgres.database,
  },
})
