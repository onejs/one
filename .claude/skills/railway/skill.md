---
name: railway
description: >-
  Deploy and manage Railway projects. Authenticate, link projects, deploy code,
  manage variables, view logs, SSH into services, and provision databases.
  Use /railway to quickly deploy or manage Railway services.
version: 1.0.0
---

# Railway CLI

Deploy and manage Railway cloud platform projects.

## Installation

```bash
brew install railway
# or: npm i -g @railway/cli
# or: bash <(curl -fsSL cli.new)
```

## Authentication

```bash
railway login              # Browser-based login
railway login --browserless  # For headless/SSH environments (prints pairing code)
railway logout             # Disconnect from account
```

**Environment Variables for CI/CD:**
- `RAILWAY_TOKEN` - Project token (deploy, redeploy, logs only)
- `RAILWAY_API_TOKEN` - Account token (full access including init, link)

## Project Management

```bash
railway init               # Create new project
railway link               # Link current directory to existing project/environment
railway service            # Link to specific service in project
railway environment        # Switch linked environment (default: production)
```

## Deployment

```bash
railway up                 # Deploy with build logs
railway up --detach        # Deploy and return immediately (no logs)
railway redeploy           # Redeploy current service
```

## Local Development

```bash
railway run <cmd>          # Run command locally with Railway env vars
railway run npm start      # Example: start dev server with Railway vars
railway shell              # Open shell with Railway environment loaded
```

## Logs & Debugging

```bash
railway logs               # View service logs
railway ssh                # SSH into running service
railway ssh -- ls          # Execute single command via SSH
```

**SSH with specific target:**
```bash
railway ssh --project=<ID> --environment=<ID> --service=<ID>
```

## Database & Services

```bash
railway add                # Provision database (Postgres, MySQL, Redis, MongoDB)
```

## Common Workflows

### Deploy a new project
```bash
railway login
railway init
railway up
```

### Link existing project and deploy
```bash
railway login
railway link
railway up
```

### Run local dev with production database
```bash
railway link
railway run npm run dev
```

### View logs for debugging
```bash
railway logs
# or SSH in for interactive debugging
railway ssh
```

## User Invocation

- `/railway` - Show status and common commands
- `/railway deploy` - Deploy current directory
- `/railway logs` - View service logs
- `/railway ssh` - Connect to service

## Agent Response Protocol

**For `/railway` or `/railway status`:**
1. Check if logged in: `railway whoami`
2. Check linked project: `railway status`
3. Report current state and suggest next actions

**For `/railway deploy`:**
1. Verify logged in and linked
2. Run `railway up` and report results
3. On failure, suggest fixes

**For `/railway logs`:**
1. Run `railway logs` (add `--help` to see filtering options)
2. Summarize recent activity

**For `/railway ssh`:**
1. Run `railway ssh` for interactive session
2. Or `railway ssh -- <command>` for one-off commands
