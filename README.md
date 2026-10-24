<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# HCM Lite

HCM Lite is an AI-assisted Human Capital Management prototype with a React frontend and a new Express/MongoDB authentication API. Most HR modules remain browser-session demos; see the limitations below.

## Run Locally

**Prerequisite:** Node.js

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`, configure MongoDB and a random `SESSION_SECRET` of at least 32 characters.
3. Start the API in one terminal with `npm run server:dev`.
4. Start Vite in another terminal with `npm run dev`. Vite proxies `/api` to `http://localhost:3001`.
5. Run `npm run build` and `npm run lint` to verify the frontend.

## Authentication and roles

The login path first asks the user to choose Employee, HR, or Admin. The selected role is only an expected account type: the server compares it with the role stored on the account before creating an HTTP-only, SameSite=Strict session. Passwords are hashed with bcrypt. Session records and application accounts are stored in MongoDB. Protected application routes require a session in production builds; the role-switching banner and dashboard preview remain enabled only in Vite development mode.

Registration is invitation-only for every role. An Admin can create an invitation with `POST /api/v1/admin/invitations`; the returned one-time token must be delivered to the invited person through an approved channel. New accounts remain pending until an Admin activates them through `PATCH /api/v1/admin/users/:id/status`. An initial Admin can be provisioned once, with `INITIAL_ADMIN_SETUP_TOKEN`, through `POST /api/v1/auth/bootstrap-admin`. The initial account also requires successful biometric enrollment. Never expose that setup token in a browser bundle or public endpoint. Passwords require at least 12 characters and are limited to bcrypt's 72-byte input size.

If an active user withdraws consent and deletes their enrollment, they are signed out and cannot use normal sign-in. They can choose **Recovery**, re-authenticate with their password and selected role, grant fresh consent, and complete face enrollment. The recovery session is limited to enrollment and is upgraded only after provider success. New users who are still pending require an Admin's status approval before login.

## Face verification provider adapter

No commercial provider has been selected or credentials supplied in this repository. The API therefore fails closed when `FACE_VERIFICATION_PROVIDER_URL` or `FACE_VERIFICATION_API_KEY` is absent. The UI requests camera access only after the user chooses face sign-in or explicitly starts registration. Captured frames are submitted transiently to the API; this application does not persist them in MongoDB or browser storage. Provider retention, deletion, liveness quality, spoof resistance, availability, and cost depend on the provider and are not established here.

The optional adapter contract is a project integration contract, not a claim of compatibility with Azure Face, AWS Rekognition, or any named vendor. Configure a trusted HTTPS service implementing:

- `POST {FACE_VERIFICATION_PROVIDER_URL}/enroll` with `{ "imageDataUrl": "...", "subjectId": "..." }`, returning `{ "success": true, "enrollmentId": "...", "liveness": "passed" }`.
- `POST {FACE_VERIFICATION_PROVIDER_URL}/match` with `{ "imageDataUrl": "..." }`, returning `{ "matched": true, "enrollmentId": "...", "liveness": "passed" }` for a uniquely matched enrollment.
- `POST {FACE_VERIFICATION_PROVIDER_URL}/verify` with `{ "imageDataUrl": "...", "enrollmentId": "..." }`, returning `{ "matched": true, "liveness": "passed" }` only after live verification.
- `DELETE {FACE_VERIFICATION_PROVIDER_URL}/enroll/{enrollmentId}`, returning `{ "success": true }`.

All provider calls are server-to-server and send `FACE_VERIFICATION_API_KEY` as a bearer token. Face registration requires explicit consent and the provider's successful enrollment and liveness response before creating the account. A webcam preview or snapshot is not treated as a match. Configure `VITE_FACE_VERIFICATION_PROVIDER` only as a non-secret UI availability hint; the server remains authoritative. A vendor adapter, its liveness implementation, and its privacy terms must be independently implemented, reviewed, and tested before production use.

## API endpoints implemented

- `GET /api/v1/auth/capabilities`, `GET /api/v1/auth/me`
- `POST /api/v1/auth/login`, `POST /api/v1/auth/face-login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/logout`
- `POST /api/v1/auth/recovery-login`, `POST /api/v1/auth/re-enroll`
- `POST /api/v1/auth/bootstrap-admin` (one-time secret-protected initial provisioning)
- `POST /api/v1/auth/face-enrollment`, `DELETE /api/v1/auth/face-enrollment`
- `POST /api/v1/admin/invitations`, `PATCH /api/v1/admin/users/:id/status`
- `POST /api/v1/attendance/face` (authenticated, verified check-in/check-out, server timestamps, duplicate protection)

Authentication and face endpoints are rate-limited. The face attendance route associates the attendance record with the server-authenticated account and requires provider verification before writing. Existing attendance UI also maintains its own demo session records; the rest of the HCM modules (employee, payroll, leave, organization, audit, announcements, and AI assistant) have not yet been migrated to database-backed API authorization.

## Environment variables

- `MONGODB_URI` — MongoDB connection string (required).
- `SESSION_SECRET` — random server-side secret, at least 32 characters (required).
- `APP_ORIGIN` — allowed browser origin for mutating requests (required; for local development, `http://localhost:3000`).
- `PORT`, `NODE_ENV` — optional server runtime settings.
- `FACE_VERIFICATION_PROVIDER_URL`, `FACE_VERIFICATION_API_KEY` — optional server-side adapter credentials.
- `INITIAL_ADMIN_SETUP_TOKEN` — optional one-time initial Admin provisioning secret; remove/rotate after use.
- `VITE_FACE_VERIFICATION_PROVIDER` — optional, non-secret frontend status hint.
- `GEMINI_API_KEY` — server-side key for a future assistant backend; it is not used by this auth API.

## AI Assistant Backend Contract

The repository currently contains no backend assistant endpoint. The chat UI posts each message to `POST /api/v1/assistant/chat` and expects a JSON success response of `{ "reply": "..." }`. It sends only the message text; conversation history is kept in component memory only and is not persisted.

The backend must authenticate the existing session, derive the user and role server-side, authorize each data/tool operation independently, validate request size, and return a clear configuration error when the hosted LLM provider is unavailable. Suggested error responses use HTTP statuses such as `401`, `403`, `404`, `413`, `429`, or `503`. Configure `GEMINI_API_KEY` only as a server-side environment variable; do not expose it through Vite/client environment variables or browser storage. No database tools or provider integration are implemented in this frontend repository.

## Announcements, Notifications, and Audit

These modules currently operate on real frontend actions and session-scoped browser state only. Announcements, role-partitioned notification read state, and supported audit events use `sessionStorage`; clearing the browser session removes them. The demo role selector is not authentication, and role-partitioned notifications are not private per-user records. Department audience filtering and the audit route guard improve the prototype experience but are not security controls.

For production, add authenticated server endpoints and database models for announcements, per-user notifications, payroll, employee/leave/organization data, and append-only audit events. The server must enforce audience/role access, assign actor identities and timestamps, validate every mutation, and protect audit records from editing or deletion. Existing browser-only modules are prototypes, not secure records.
