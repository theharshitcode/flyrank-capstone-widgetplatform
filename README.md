# Embeddable Widget & Lead-Capture Platform

A backend-focused platform that allows business owners to create embeddable lead-capture widgets, collect submissions, and view submission analytics.

## Features

- User registration and login using password hashing and JWT authentication
- Widget creation, retrieval, updating, and deletion
- Owner-based access control for widgets and submissions
- Embeddable JavaScript widget using a single script tag
- Public widget configuration endpoint with cache headers and versioning
- Public submission endpoint with validation and JSON error responses
- Cross-Origin Resource Sharing (CORS) support
- Per-IP and per-widget submission rate limiting
- Honeypot-based spam prevention
- PostgreSQL persistence with database migrations and indexes
- IP geolocation with fallback providers
- Owner dashboard with submissions and analytics
- Background notification job queue with retries and failure handling
- Docker Compose configuration for PostgreSQL

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Docker Compose
- JWT authentication
- bcryptjs
- Zod validation
- express-rate-limit
- pg
- Plain JavaScript
- Node.js built-in test runner

## Prerequisites

Install the following before running the project:

- Node.js and npm
- Docker Desktop
- Git

## Environment Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a local `.env` file from the example:

```powershell
Copy-Item .env.example .env
```

Update `.env` with your own values.

Required configuration should include:

- `DATABASE_URL` — PostgreSQL connection string
- `POSTGRES_PASSWORD` — database password used by Docker Compose
- `JWT_SECRET` — strong secret used to sign authentication tokens
- `PORT` — API server port, typically `5000`

Ensure that `DATABASE_URL` uses the database credentials and host port configured in `docker-compose.yml`.

Never commit `.env` or real credentials to GitHub.

## Start the Database

Start PostgreSQL using Docker Compose:

```bash
docker compose up -d db
```

Check the container status:

```bash
docker compose ps
```

Wait until the database reports that it is healthy.

## Database Migrations

SQL migrations are located in:

```text
src/db/migrations/
```

Apply the migrations in numerical order against the configured PostgreSQL database.

The project includes schema definitions for:

- Users
- Widgets
- Submissions
- Notification jobs

The schema uses UUID identifiers, foreign keys, constraints, JSONB fields, and indexes for common queries.

If a migration has already been applied, do not blindly execute it again unless it is designed to be idempotent.

## Run the Application

Start the development server:

```bash
npm run dev
```

Start the server normally:

```bash
npm start
```

Run the background notification worker in a separate terminal:

```bash
npm run worker
```

Check application health:

```text
GET /health
```

The health endpoint should return a successful response when the API and database are available.

## API Overview

The application provides the following API capabilities. Confirm the exact URL prefixes in `src/server.js` and the corresponding route files.

| Method | Purpose | Authentication |
|---|---|---|
| POST | Register an account | Public |
| POST | Log in | Public |
| POST | Create a widget | Required |
| GET | List owned widgets | Required |
| GET | Retrieve an owned widget | Required |
| PUT/PATCH | Update an owned widget | Required |
| DELETE | Delete an owned widget | Required |
| GET | Retrieve public widget configuration | Public |
| POST | Submit widget data | Public |
| GET | Retrieve dashboard submissions | Required |
| GET | Retrieve dashboard analytics | Required |
| GET | Check API health | Public |

Authenticated endpoints require a valid bearer token:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Create an Account and Log In

Register an account using the authentication endpoint configured in `src/routes/authRoutes.js`.

Log in with the registered credentials to receive an access token.

Use the returned token when calling protected widget and dashboard endpoints.

Do not include real passwords or tokens in documentation, screenshots, or public repositories.

## Create and Embed a Widget

First, create a widget using the authenticated widget API.

Copy the generated widget ID. Add the widget script to a webpage:

```html
<div id="lead-widget"></div>

<script
  src="http://localhost:5000/widget.js"
  data-widget-id="YOUR_WIDGET_ID">
</script>
```

Replace `YOUR_WIDGET_ID` with the ID of an existing widget.

For a deployed environment, replace the local script URL with the actual API origin.

The JavaScript widget retrieves the public configuration and renders the configured form. Visitors can submit their data through the public submission endpoint.

## Public Submission Processing

The public submission flow is designed to:

1. Receive submitted form data.
2. Validate the request body and configured widget fields.
3. Reject invalid submissions and honeypot spam.
4. Apply rate limiting.
5. Retrieve geolocation information using fallback providers.
6. Store valid submissions in PostgreSQL.
7. Queue notification work for background processing.

Geolocation and notification failures should not cause an otherwise valid submission to be lost.

Verify transaction handling and error recovery before treating this behavior as production-ready.

## Dashboard and Analytics

Authenticated widget owners can use the dashboard API to retrieve their submissions and analytics.

The backend should restrict every query to the authenticated owner so that one account cannot access another account's data.

Pagination and date-based analytics help organize submission data.

## Background Notification Worker

The notification worker processes queued notification jobs.

Its intended responsibilities include:

- Claiming available jobs safely
- Tracking processing attempts
- Retrying failed jobs
- Applying retry delays
- Marking exhausted jobs as failed
- Logging failures for investigation

Run the worker separately from the API server:

```bash
npm run worker
```

Actual email or webhook delivery must be configured and tested separately if required. A logged successful job is not proof that a real notification was delivered.

## Run Automated Tests

Run the test suite:

```bash
npm test
```

The current health test checks that the health endpoint responds successfully and reports a connected database.

Before submission, add and execute tests for:

- Account registration and login
- Invalid authentication tokens
- Widget CRUD operations
- Cross-owner access prevention
- Valid and invalid submissions
- Malformed and oversized request bodies
- Rate limiting
- Honeypot spam rejection
- Geolocation fallback and provider failures
- Notification retries and failure handling
- CORS and public widget embedding

Only report tests as passing when they have actually been executed.

## Project Structure

```text
flyrank-capstone-widgetplatform/
├── demo/
├── docs/
│   └── design.md
├── public/
│   └── widget.js
├── src/
│   ├── config/
│   ├── controllers/
│   ├── db/
│   │   └── migrations/
│   ├── jobs/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── server.js
├── test/
├── .env.example
├── .gitignore
├── BUILDLOG.md
├── EVIDENCE.md
├── capstone.yaml
├── docker-compose.yml
├── package.json
└── README.md
```

Some files may differ depending on the final implementation.

## Documentation

- `docs/design.md` — architecture and design decisions
- `BUILDLOG.md` — implementation progress
- `EVIDENCE.md` — acceptance-test evidence
- `capstone.yaml` — capstone metadata
- `.env.example` — environment variable template

## Security Considerations

- Store password hashes instead of plaintext passwords.
- Protect private endpoints using authentication.
- Scope database queries by authenticated owner.
- Validate request bodies before processing them.
- Keep secrets out of source control.
- Use HTTPS in production.
- Configure allowed CORS origins appropriately for production.
- Trust forwarded IP headers only behind correctly configured trusted proxies.
- Apply request-size limits and rate limiting.
- Avoid exposing internal errors, secrets, or stack traces to public clients.
- Review notification retry behavior and job locking before production deployment.

## Current Project Status

The database and initial application health test have been verified locally.

Passing the health test alone does not establish that every feature or acceptance criterion has passed. See `EVIDENCE.md` for the actual verification results and remaining work.

## License

Add the license required by your project or program before publishing the repository.
