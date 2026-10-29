# FlyRank Widget Platform — Design

## Problem
Allow business owners to create embeddable lead-capture widgets and view
visitor submissions from an authenticated dashboard.

## Actors
- Owner: manages only their own widgets and submissions.
- Visitor: loads a public widget and submits form data.

## Data model
- users: owner identity and password hash.
- widgets: owner, type, title, form fields, display configuration and version.
- submissions: widget, owner, submitted data, location metadata and timestamp.

## Request flow
1. Owner authenticates and creates a widget.
2. API returns a public embed snippet.
3. External page loads the versioned widget JavaScript.
4. Script fetches public widget configuration.
5. Visitor submits the form to the public API.
6. API validates, rate-limits and spam-checks the request.
7. Geo providers are tried in order; failure does not block storage.
8. Submission is persisted; notification work runs independently.
9. Owner views submissions and aggregate statistics.

## Security boundaries
- Authenticate owner-only endpoints.
- Scope every widget and submission query to the authenticated owner.
- Validate public payloads before business logic.
- Apply request-size limits, CORS, rate limiting and spam controls.
- Never commit secrets.

## Explicit non-goal
This capstone will not implement a full visual drag-and-drop form builder.

## Initial stack
Node.js, Express, PostgreSQL, Docker Compose and plain JavaScript.
