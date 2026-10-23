# MiniLedger — 2 minute 45 second demo script

Use this as a recording checklist; do not record a real friend's phone number or actual receipt containing private data. Use demo data only.

## 0:00–0:20 — Introduce the app

Show MiniLedger's login screen. Say: “MiniLedger is a lightweight lending tracker built with React Native, a TypeScript Express API and PostgreSQL. It tracks the amount lent, repayments, due dates and optional receipts.”

## 0:20–0:45 — Mock OTP login

Enter a demo phone number and click **Send demo OTP**. Switch briefly to the API terminal to show the generated OTP log, then return to the app and verify it. Say: “For this assignment, phone verification is mocked; the OTP is only printed by the server, and the client never receives it in the request response.”

## 0:45–1:20 — Add a loan and receipt

On the dashboard, point out the summary tiles. Click **Add a loan**, enter a demo friend name, amount and due date, attach a small sample JPEG/PNG/WebP receipt, then save. Show the new record and receipt indicator/preview. If recording on web, keep browser developer tools ready to show `POST /api/loans` with a multipart request when useful.

## 1:20–1:55 — Overdue and repayments

Add or use a second demo loan with a due date before today. Show that it is highlighted as overdue and the overdue summary changes. Mark a pending loan as repaid and show its status and the total-repaid value update. Point to the filters and name search.

## 1:55–2:25 — Explain backend separation

Briefly show the project folders in the editor: route/controller/service/repository separation, PostgreSQL schema, centralized error handler, JWT middleware and local receipt storage. Do not spend too long on code.

## 2:25–2:45 — Tests and close

Show `npm run typechecking`, `npm test` and `npm run build:api` results only after all three have passed locally. Close with: “MiniLedger covers the core lending workflow, protects entries by authenticated user, validates inputs and supports optional receipt uploads.”

## Before recording

- Clear personal notifications and close unrelated tabs.
- Use fake data and an image without private information.
- Start PostgreSQL, the API and Expo before recording.
- If possible, show a browser Network request for `POST /api/loans` and its `201` response as proof the receipt flow reaches the API.
- Upload the 2–3 minute clip to Loom or Google Drive with viewer access enabled, then paste the link into the submission form/README.
