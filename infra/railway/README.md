# Railway Environment Configuration

Railway environments are configured via the Railway dashboard and CLI.
Each service already has a `railway.toml` in its own directory.

## Environment Setup

### Create environments
```bash
railway environment create qa
railway environment create production
```

### Set variables per service per environment
```bash
# Example: set auth-service variables for QA
railway variables set \
  --service auth-service \
  --environment qa \
  NODE_ENV=staging \
  LOG_LEVEL=info \
  SERVICE_NAME=auth-service \
  DATABASE_URL=<railway-qa-postgres-url> \
  REDIS_URL=<railway-qa-redis-url> \
  JWT_PRIVATE_KEY=<key> \
  JWT_PUBLIC_KEY=<key> \
  GOOGLE_CLIENT_ID=<id> \
  GOOGLE_CLIENT_SECRET=<secret> \
  GOOGLE_CALLBACK_URL=https://qa-api.yourdomain.com/api/v1/auth/google/callback
```

### Deploy to a specific environment
```bash
railway up --service auth-service --environment qa
railway up --service auth-service --environment production
```

## Service → Environment Matrix

| Service              | QA Port | Prod Port | Internal Hostname (Railway)                     |
|----------------------|---------|-----------|------------------------------------------------|
| api-gateway          | 3000    | 3000      | http://api-gateway.railway.internal:3000        |
| auth-service         | 3001    | 3001      | http://auth-service.railway.internal:3001       |
| user-service         | 3002    | 3002      | http://user-service.railway.internal:3002       |
| image-service        | 3003    | 3003      | http://image-service.railway.internal:3003      |
| notification-service | 3004    | 3004      | http://notification-service.railway.internal:3004 |
| analytics-service    | 3005    | 3005      | http://analytics-service.railway.internal:3005  |

## Required GitHub Secrets

Set these in GitHub repo Settings → Environments:

### `qa` environment
- `RAILWAY_TOKEN` — Railway project token
- `RAILWAY_QA_API_URL` — Public URL of api-gateway in QA
- `RAILWAY_QA_DATABASE_URL` — PostgreSQL connection string for QA
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

### `production` environment
- `RAILWAY_TOKEN` — Railway project token (same or separate)
- `RAILWAY_PROD_API_URL` — Public URL of api-gateway in production
- `RAILWAY_PROD_DATABASE_URL` — PostgreSQL connection string for production
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
