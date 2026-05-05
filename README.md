# Federal Healthcare Claims & Provider Management System

A CMS-style federal health IT platform for managing healthcare providers and processing medical claims. Built with a FastAPI backend, React frontend, PostgreSQL database, and AWS services (emulated locally via LocalStack).

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Running Tests](#running-tests)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Seed Data](#seed-data)
- [Infrastructure (Terraform)](#infrastructure-terraform)
- [CI/CD Pipeline](#cicd-pipeline)
- [Security Notes](#security-notes)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Compose (local)                   │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌────────────────────┐  │
│  │  React SPA  │───▶│  FastAPI    │───▶│  PostgreSQL 16     │  │
│  │  Vite 5     │    │  Python 3.12│    │  (async SQLAlchemy)│  │
│  │  :5173      │    │  :8000      │    │  :5432             │  │
│  └─────────────┘    └──────┬──────┘    └────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│                    ┌───────────────┐                            │
│                    │  LocalStack   │                            │
│                    │  S3 · Secrets │                            │
│                    │  CloudWatch   │                            │
│                    │  :4566        │                            │
│                    └───────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

**Request flow:**
1. React SPA calls `/api/v1/*` endpoints
2. FastAPI validates JWT, enforces RBAC, applies rate limiting
3. Business logic reads/writes PostgreSQL via async SQLAlchemy
4. File uploads (CSV claims, provider documents) are stored in S3 (LocalStack locally, real AWS in production)
5. CSV imports run as background tasks, updating batch progress in real time

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 5, TypeScript (strict), shadcn/ui, Tailwind CSS 3, React Router v6, Recharts, Axios, React Hook Form + Zod |
| **Backend** | Python 3.12, FastAPI 0.115+, SQLAlchemy 2.0 (async), Alembic, Pydantic v2, passlib[bcrypt], python-jose, structlog, slowapi |
| **Database** | PostgreSQL 16 |
| **AWS Services** | S3 (document/CSV storage), Secrets Manager, CloudWatch Logs |
| **Local AWS** | LocalStack 3.4 |
| **Containerization** | Docker + Docker Compose (multi-stage Dockerfiles) |
| **IaC** | Terraform (modular, localstack + production environments) |
| **Testing** | pytest + pytest-asyncio (backend), Vitest + React Testing Library (frontend), Playwright (E2E) |
| **CI/CD** | GitHub Actions |

---

## Project Structure

```
Healthcare Management System/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # Lint, test, E2E on every PR
│   │   └── deploy.yml          # Build → ECR → Terraform → ECS redeploy
│   └── dependabot.yml          # Weekly dependency updates
│
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   └── endpoints/
│   │   │       ├── auth.py         # POST /auth/login, /auth/refresh
│   │   │       ├── providers.py    # Full provider CRUD + document upload
│   │   │       └── claims.py       # Claims list/metrics + CSV batch upload
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic BaseSettings (lru_cache)
│   │   │   ├── security.py         # JWT encode/decode, bcrypt
│   │   │   ├── logging.py          # Structured JSON request logging
│   │   │   └── dependencies.py     # get_current_user, require_admin/viewer
│   │   ├── db/
│   │   │   ├── models/             # SQLAlchemy ORM models
│   │   │   ├── schemas/            # Pydantic request/response schemas
│   │   │   ├── crud/               # Database query functions
│   │   │   ├── session.py          # Async engine + session factory
│   │   │   └── base.py             # DeclarativeBase (imports all models)
│   │   ├── services/
│   │   │   ├── s3.py               # boto3 S3 wrapper (LocalStack toggle)
│   │   │   └── claims_parser.py    # Background CSV → PostgreSQL importer
│   │   └── main.py                 # App factory, middleware, rate limiting
│   ├── alembic/                    # Async migrations
│   ├── tests/
│   │   ├── conftest.py             # SQLite in-memory fixtures, httpx client
│   │   ├── unit/                   # JWT, CSV parser, auth CRUD tests
│   │   └── integration/            # Full API flow tests
│   ├── scripts/
│   │   └── seed.py                 # Demo users, providers, claims
│   ├── Dockerfile                  # Multi-stage (development + production)
│   └── pyproject.toml              # Dependencies, ruff, mypy, pytest config
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts           # Axios instance + 401 silent-refresh interceptor
│   │   │   ├── index.ts            # Typed API functions
│   │   │   └── types.ts            # TypeScript interfaces for all API shapes
│   │   ├── context/
│   │   │   └── AuthContext.tsx     # JWT decode, login/logout, silent refresh
│   │   ├── routes/
│   │   │   └── ProtectedRoute.tsx  # ProtectedRoute + AdminRoute guards
│   │   ├── components/
│   │   │   ├── app/AppShell.tsx    # Sidebar layout
│   │   │   └── ui/                 # shadcn/ui primitives
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx   # KPI cards + Recharts (pie, line, bar)
│   │   │   ├── ProvidersPage.tsx   # Filterable table + slide-over panel
│   │   │   ├── ClaimsPage.tsx      # Filtered paginated claims table
│   │   │   └── UploadPage.tsx      # Drag-and-drop CSV upload + batch polling
│   │   └── lib/utils.ts            # clsx + tailwind-merge helper
│   ├── tests/e2e/                  # Playwright specs
│   ├── nginx.conf                  # Production SPA serving + /api proxy
│   ├── playwright.config.ts
│   ├── vite.config.ts
│   └── package.json
│
├── infrastructure/
│   ├── modules/
│   │   ├── networking/             # VPC, subnets, security groups
│   │   ├── database/               # RDS PostgreSQL
│   │   ├── storage/                # S3 bucket + versioning
│   │   ├── compute/                # ECS Fargate, ALB, ECR
│   │   ├── monitoring/             # CloudWatch alarms + log groups
│   │   └── secrets/                # Secrets Manager
│   └── environments/
│       ├── localstack/             # Local dev Terraform (S3, Secrets, Logs)
│       └── production/             # Real AWS — wires all modules together
│
├── docker-compose.yml
├── .env.example
└── .gitignore
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Docker Desktop | 4.x+ | Must be running |
| Git | any | |
| Python | 3.12+ | Only needed for running tests outside Docker |
| Node.js | 20+ | Only needed for frontend dev outside Docker |

---

## Local Development Setup

### 1. Clone and configure environment

```bash
git clone <repo-url>
cd "Healthcare Management System"
cp .env.example .env
```

The default `.env` values work out of the box for local development — no changes required.

### 2. Start all services

```bash
docker compose up --build
```

First run pulls images and builds both Docker images (~2–3 min). Subsequent starts are fast.

Wait until all services are healthy:
```
✔ db        healthy
✔ localstack healthy  
✔ backend   running
✔ frontend  running
```

### 3. Run database migrations

```bash
docker compose exec backend alembic upgrade head
```

### 4. Seed demo data

```bash
docker compose exec backend python scripts/seed.py
```

This creates:
- **2 users** — admin and viewer accounts
- **10 specialties** — Family Medicine, Cardiology, etc.
- **20 providers** — across various states with random specialties
- **200 claims** — across all statuses and claim types

### 5. Open the application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API (Swagger) | http://localhost:8000/docs |
| API (ReDoc) | http://localhost:8000/redoc |
| Health check | http://localhost:8000/health |
| LocalStack | http://localhost:4566 |

### Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hcms.local | admin_password |
| Viewer | viewer@hcms.local | viewer_password |

### Role permissions

| Feature | Admin | Viewer |
|---------|-------|--------|
| View dashboard / claims / providers | ✅ | ✅ |
| Create / edit / delete providers | ✅ | ❌ |
| Upload provider documents | ✅ | ❌ |
| Upload CSV claims batch | ✅ | ❌ |
| View upload history | ✅ | ❌ |

---

## Running Tests

### Backend

```bash
cd backend

# Install dev dependencies (first time only)
pip install -e ".[dev]" aiosqlite

# Run all tests with coverage
pytest -v --cov=app --cov-report=term-missing

# Unit tests only
pytest tests/unit/ -v

# Integration tests only
pytest tests/integration/ -v
```

Tests use an in-memory SQLite database — no Docker required.

### Frontend (Vitest)

```bash
cd frontend
npm test              # watch mode
npm run test -- --run  # single run (CI mode)
```

### End-to-End (Playwright)

Requires the full Docker stack running with seed data loaded.

```bash
cd frontend

# Install browser (first time only)
npx playwright install chromium

# Run E2E tests
npx playwright test

# View HTML report
npx playwright show-report
```

---

## API Reference

All endpoints are prefixed with `/api/v1`. Full interactive docs at http://localhost:8000/docs.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/login` | — | Email + password → JWT token pair |
| `POST` | `/auth/refresh` | — | Refresh token → new token pair |

### Providers

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/providers` | Viewer | List with search, state, specialty filters + pagination |
| `POST` | `/providers` | Admin | Create a provider |
| `GET` | `/providers/{id}` | Viewer | Get single provider |
| `PUT` | `/providers/{id}` | Admin | Update provider |
| `DELETE` | `/providers/{id}` | Admin | Soft-delete provider |
| `GET` | `/providers/specialties` | Viewer | List all specialties |
| `POST` | `/providers/{id}/documents/upload` | Admin | Upload document to S3 |
| `GET` | `/providers/{id}/documents` | Viewer | List provider documents |

### Claims

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/claims` | Viewer | Paginated claims with filters |
| `GET` | `/claims/metrics` | Viewer | Dashboard metrics (KPIs, charts) |
| `POST` | `/uploads/claims-csv` | Admin | Upload CSV batch (async, 202) |
| `GET` | `/uploads/batches` | Admin | List recent upload batches |
| `GET` | `/uploads/batches/{id}` | Admin | Get batch status + error detail |

### Rate Limits

- Global: **100 requests/minute** per IP
- `/auth/login`: **5 requests/minute** per IP

### CSV Upload Format

Required columns (header names are case-sensitive):

```csv
claim_number,provider_npi,claim_type,service_date,billed_amount
CLM001,1234567890,professional,2025-01-15,250.00
CLM002,9876543210,dental,2025-01-16,80.50
```

Optional columns: `status`, `approved_amount`, `patient_id`, `diagnosis_code`, `procedure_code`, `notes`

Valid `claim_type` values: `professional`, `institutional`, `dental`  
Valid `status` values: `pending`, `approved`, `denied`, `paid` (defaults to `pending`)  
Max file size: **10 MB**

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `hcms` | Database username |
| `POSTGRES_PASSWORD` | `hcmspassword` | Database password |
| `POSTGRES_DB` | `hcms` | Database name |
| `SECRET_KEY` | `dev-secret-key-...` | HS256 JWT signing key — **change in production** |
| `ENVIRONMENT` | `development` | `development` or `production` |
| `AWS_DEFAULT_REGION` | `us-east-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | `test` | AWS credentials (use `test` for LocalStack) |
| `AWS_SECRET_ACCESS_KEY` | `test` | AWS credentials (use `test` for LocalStack) |
| `LOCALSTACK_ENDPOINT_URL` | `http://localhost:4566` | Leave blank to use real AWS |
| `S3_BUCKET_NAME` | `hcms-documents` | S3 bucket for uploads |
| `USE_SECRETS_MANAGER` | `false` | Pull DB credentials from Secrets Manager |

---

## Database Migrations

Migrations are managed with Alembic and run asynchronously against PostgreSQL.

```bash
# Apply all pending migrations
docker compose exec backend alembic upgrade head

# Create a new migration from model changes
docker compose exec backend alembic revision --autogenerate -m "add index to claims"

# Rollback one migration
docker compose exec backend alembic downgrade -1

# View migration history
docker compose exec backend alembic history
```

---

## Seed Data

```bash
docker compose exec backend python scripts/seed.py
```

The script is idempotent — safe to run multiple times. It checks for existing records before inserting.

---

## Infrastructure (Terraform)

### Local (LocalStack)

```bash
cd infrastructure/environments/localstack
terraform init
terraform apply
```

Creates: S3 bucket, CloudWatch log group, Secrets Manager secret — all on LocalStack.

### Production (AWS)

```bash
cd infrastructure/environments/production
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with real values
terraform init
terraform apply
```

**Modules provisioned:**
- **networking** — VPC, public/private subnets, NAT gateway, security groups
- **database** — RDS PostgreSQL (Multi-AZ in production)
- **storage** — S3 bucket with versioning
- **compute** — ECS Fargate cluster, ALB, ECR repositories, task definitions
- **monitoring** — CloudWatch alarms (CPU, memory, 5xx errors), log groups
- **secrets** — Secrets Manager for DB credentials

> ⚠️ Never commit `terraform.tfvars` — it contains secrets. Only `terraform.tfvars.example` is committed.

---

## CI/CD Pipeline

### `ci.yml` — runs on every pull request and push to `main`

1. **Backend lint & test** — ruff, mypy, pytest with coverage (≥70%)
2. **Frontend lint & test** — ESLint, TypeScript check, Vitest
3. **E2E** (push to `main` only) — full Docker Compose stack + Playwright

### `deploy.yml` — runs on push to `main` after CI passes

1. Build and push Docker images to ECR (tagged with commit SHA)
2. Terraform apply (production environment)
3. Force new ECS deployment

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM deploy user key |
| `AWS_SECRET_ACCESS_KEY` | IAM deploy user secret |
| `DB_USERNAME` | Production DB username |
| `DB_PASSWORD` | Production DB password |
| `APP_SECRET_KEY` | Production JWT signing key (64+ random chars) |

### Dependabot

Automated weekly PRs for: pip packages, npm packages, GitHub Actions, Terraform providers.

---

## Security Notes

- **Passwords** hashed with bcrypt (cost factor 12)
- **JWT** tokens use HS256; access tokens expire in 30 minutes, refresh tokens in 7 days
- **Access tokens** stored in-memory only (`window.__accessToken`) — never in localStorage or cookies
- **Refresh tokens** stored in localStorage; cleared on logout
- **CORS** restricted to `localhost:5173` in development; empty list (deny all) in production (traffic goes through ALB)
- **Rate limiting** on all endpoints (100/min global, 5/min on login) via slowapi
- **Security headers** on all responses: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `HSTS` (production)
- **File uploads** validated by content type whitelist + extension check + 10MB size limit
- **SQL injection** prevented by SQLAlchemy parameterised queries throughout
- **NPI validation** enforced at schema level (`^\d{10}$` pattern)

---

## Useful Commands

```bash
# View logs for a specific service
docker compose logs -f backend
docker compose logs -f frontend

# Restart a single service
docker compose restart backend

# Stop everything (preserves database volume)
docker compose down

# Wipe database and start completely fresh
docker compose down -v
docker compose up --build
docker compose exec backend alembic upgrade head
docker compose exec backend python scripts/seed.py

# Open a Python shell inside the backend container
docker compose exec backend python

# Connect to the database directly
docker compose exec db psql -U hcms -d hcms

# Check LocalStack S3 bucket contents
docker compose exec localstack awslocal s3 ls s3://hcms-documents/ --recursive
```
