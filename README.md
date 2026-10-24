<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# HCM Lite

HCM Lite is a frontend prototype for an AI-assisted Human Capital Management system.

## Run Locally

**Prerequisite:** Node.js

1. Install dependencies with `npm install`.
2. Start the frontend with `npm run dev`.

## Face Verification Status

This frontend does not include a working biometric backend or database-backed face matching service. The login, profile enrollment, and attendance face flows are implemented as secure integration points and remain disabled until a trusted provider such as Azure Face, AWS Rekognition, or a server-side face verification API is configured.

The application deliberately does not auto-create accounts, auto-approve a face match, or store raw camera frames in browser storage. If a provider is unavailable, the UI shows a clear configuration message and requires the user to continue with the normal account-based login flow.

## AI Assistant Backend Contract

The repository currently contains no backend assistant endpoint. The chat UI posts each message to `POST /api/v1/assistant/chat` and expects a JSON success response of `{ "reply": "..." }`. It sends only the message text; the browser-selected preview role and employee identity are never sent as authorization claims. Conversation history is kept in component memory only and is not persisted.

The backend must authenticate the existing session, derive the user and role server-side, authorize each data/tool operation independently, validate request size, and return a clear configuration error when the hosted LLM provider is unavailable. Suggested error responses use HTTP statuses such as `401`, `403`, `404`, `413`, `429`, or `503`. Configure `GEMINI_API_KEY` only as a server-side environment variable; do not expose it through Vite/client environment variables or browser storage. No database tools or provider integration are implemented in this frontend repository.

## Announcements, Notifications, and Audit

These modules currently operate on real frontend actions and session-scoped browser state only. Announcements, role-partitioned notification read state, and supported audit events use `sessionStorage`; clearing the browser session removes them. The demo role selector is not authentication, and role-partitioned notifications are not private per-user records. Department audience filtering and the audit route guard improve the prototype experience but are not security controls.

For production, add authenticated server endpoints and database models for announcements, per-user notifications, and append-only audit events. The server must enforce audience/role access, assign actor identities and timestamps, validate every mutation, and protect audit records from editing or deletion. Frontend audit events cover supported employee, leave, attendance correction, organization profile/rules, and announcement operations only; login, payroll, permission, and backend security events are not available in this frontend.
