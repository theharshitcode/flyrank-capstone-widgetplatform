# Build Log

## Project

Embeddable Widget & Lead-Capture Platform

## Implemented

- Node.js and Express API
- PostgreSQL database in Docker Compose
- Initial database schema and indexes
- User registration and login using password hashing and JWT
- Authenticated, owner-scoped widget CRUD
- Public widget configuration endpoint
- Embeddable JavaScript form
- Submission validation and honeypot check
- Per-IP and per-widget rate limiting
- Geolocation provider fallback
- Dashboard submissions and analytics
- Notification job table and worker retry mechanism
- README and project documentation

## Local Verification

- PostgreSQL container started and health checked.
- Application health endpoint returned status `ok` with database `connected`.
- Automated test command: `npm test`
- Confirmed test result: 1 passed, 0 failed.

## Remaining Work

- Add automated authentication and widget ownership tests.
- Test valid, malformed, and oversized submission requests.
- Test rate limiting and honeypot rejection.
- Test geolocation fallback and provider failure behavior.
- Verify notification retry limits and failure recovery.
- Implement and test real email or webhook delivery.
- Implement conditional ETag handling.
- Complete EVIDENCE.md with actual test outputs.
- Re-run the full test suite before submission.