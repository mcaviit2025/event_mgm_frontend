# Event management admin UI

React + Vite admin interface for the Spring Boot event management API. The app source is organized by feature, shared UI, API services, utilities, and styles.

## Run locally

1. Start the backend using its usual Spring profile and database configuration. By default, it listens on `http://localhost:8080` with the `/api` context path.
2. From this `frontend` directory, run `npm install`, then `npm run dev`.
3. Open the local URL printed by Vite to browse public events and register as a student. Open `/admin` to sign in as an administrator.

Vite proxies `/api` requests to `http://localhost:8080`. To use a different API base URL, set `VITE_API_BASE_URL` in a local `.env` file (for example, `VITE_API_BASE_URL=https://example.test/api`).

The student landing page lists events open for registration and supports solo and group registration. The registration dialog guides students through participant details, then payment/review. Solo registration collects one participant; group registration collects a leader and at least one team member, with a distinct email and complete student/contact details for each participant. Paid registrations require a payment screenshot (PNG, JPG, or GIF, up to 5 MB); free registrations do not. Group fees are charged once for the registration. Admins can review proofs and verify or reject payments. The Collections screen includes registration counts and verified collection totals per event and overall.

Public routes are `GET /api/v1/events`, `POST /api/v1/registrations/solo`, and `POST /api/v1/registrations/group`. Registration POST requests use `multipart/form-data`: a JSON `request` part and an optional `paymentScreenshot` image part. The solo JSON fields are `eventId`, `firstName`, `middleName`, `lastName`, `email`, `phoneNumber`, `collegeName`, and `course`. Group JSON fields are `eventId`, `leader` (participant fields), and `teamMembers` (an array of participant fields). Date of birth and UTR are not registration fields.

Admin routes include `GET /api/v1/admin/payments`, `PATCH /api/v1/admin/payments/{registrationId}`, `GET /api/v1/admin/payments/{registrationId}/proof`, and `GET /api/v1/admin/collections`. These routes require an administrator token. Only verified payments contribute to collected amounts.

## Participant downloads

Open **Participant downloads** in the admin sidebar to export the participant list for one event or multiple selected events. Excel workbooks include a combined participant tab, an event-specific tab for each selected event, and a summary tab. The download screen supports payment-status and registration-status filters, and can include each group teammate as a separate participant row or export only registration leaders.

The export uses active registrations and active team members. Participant rows include event, registration code/type, role, name, email, phone, college, course, registration date, registration/payment status, and the registration amount. For group registrations, the amount due appears only on the leader row so it is not duplicated for each teammate. The authenticated endpoint is `GET /api/v1/admin/participants/export.xlsx`; pass one or more `eventIds`, and optionally `paymentStatus`, `registrationStatus`, and `includeTeamMembers`.

## Existing database update

Before running the updated backend against an existing MySQL database, apply [`src/main/resources/db/manual/20261018_payment_proofs_and_remove_dob.sql`](../src/main/resources/db/manual/20261018_payment_proofs_and_remove_dob.sql). It removes the date-of-birth and UTR columns and adds the payment-proof path column. Back up the database first; dropping these columns permanently removes their existing values. New databases receive the updated columns through Hibernate schema generation.

## Backend event fee

`eventFee` is accepted by `POST /api/v1/admin/events`, optionally updated with `PUT /api/v1/admin/events/{id}`, and returned in event responses. It must be non-negative, with at most two fractional digits.

## Project layout

```text
src/
  app/                 App entry and authentication state
  features/
    auth/              Administrator login
    events/            Dashboard, event table, and create/edit form
    lookups/           Category and event-type creation
    payments/          Authenticated screenshot review and payment verification
    collections/       Event-wise and overall collection reporting
    participants/      Event-wise and multi-event Excel participant exports
    student/           Public event landing page and registration forms
  services/            HTTP API client
  shared/
    components/        Reusable UI components
    layout/            Authenticated admin shell
  styles/              Global and responsive styles
  utils/               Date, amount, and error formatters
```

## Windows Rollup install recovery

If Vite reports that `@rollup/rollup-win32-x64-msvc` is missing or is not a valid Win32 application, its installed optional native package is corrupted or was installed for the wrong platform. Close any Vite process, then from the `frontend` directory run:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install --include=optional
npm run dev
```

Run the removal commands only from the `frontend` directory. This clears the frontend's generated dependencies and lockfile so npm can regenerate the Windows Rollup binary from the manifest.
"# event_mgm_frontend" 
