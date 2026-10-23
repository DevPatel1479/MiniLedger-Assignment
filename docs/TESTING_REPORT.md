# MiniLedger Testing Report

**Project:** MiniLedger friend-loan tracker  
**Report date:** 22 October 2026  
**Scope:** API, mobile utility tests, type checks, build and manual end-to-end flow

## Execution status for this delivered source bundle

The tests and commands below have been added to the project. The full workspace type checks, Vitest suites and API build have **not been run** because npm registry access failed with a DNS `EAI_AGAIN` error during dependency resolution. A syntax/transpilation scan of all 45 TypeScript/TSX files reported zero diagnostics. A standalone strict TypeScript check of the pure mobile loan helper/types passed, and 9 standalone behavioral assertions for overdue status, due-today/upcoming/repaid status, validation, and initials passed. These checks are not substitutes for a full dependency-installed build. Those checks are not substitutes for a full dependency-installed build. Run the commands in the README on the target Windows machine after `npm install`, and update this report with the actual output before submission.

| Check | Command | Status in this environment | Expected result |
|---|---|---|---|
| API TypeScript | `npm run typecheck --workspace @miniledger/api` | Not executed | Exit code 0 |
| Mobile TypeScript | `npm run typecheck --workspace @miniledger/mobile` | Not executed | Exit code 0, no React Native JSX element-type errors |
| Assignment alias | `npm run typechecking` | Not executed | Runs API and mobile checks; exit code 0 |
| API unit/validation tests | `npm run test:api` | Not executed | All Vitest tests pass |
| Mobile helper tests | `npm run test:mobile` | Not executed | All Vitest tests pass |
| Full tests | `npm test` | Not executed | Both workspace test suites pass |
| API build | `npm run build:api` | Not executed | `api/dist` generated without compiler errors |
| PostgreSQL migration/startup | `npm run dev:api` | Not executed | Schema ready and API listening on port 4000 |
| Receipt end-to-end | Add a loan with a real image from the app | Not executed | HTTP 201; path served from `/uploads`; entry lists receipt path |

## Automated cases included

### API service and validation tests

1. OTP request stores a hashed challenge and calls the injected server-log function with the demo code.
2. Invalid phone number rejected.
3. Correct OTP returns a JWT, returns the user's phone and consumes the challenge.
4. Incorrect OTP rejected and attempts incremented.
5. Expired OTP rejected and challenge deleted.
6. Malformed OTP rejected before lookup.
7. OTP challenge is invalidated after the configured maximum incorrect attempts.
8. Valid loan is created and the friend name is trimmed.
9. Empty name, zero amount, over-precision amount and invalid calendar date are rejected.
10. Receipt storage is cleaned up if PostgreSQL insert fails.
11. Pending loan can be marked repaid.
12. Repeated repayment is rejected as a conflict.
13. A user cannot update a loan owned by another user.
14. Phone, amount precision and name length validation are checked.
15. HTTP health route, unauthenticated loan-route protection and consistent unknown-route response are checked by Supertest.
16. Receipt storage rejects a non-image payload and supports generated-name save/removal.
17. Summary service returns repository totals for the current user.

### Mobile pure-helper tests

1. Overdue, due-today, upcoming and repaid status logic.
2. INR currency formatting.
3. Date formatting without UTC day shift.
4. Friend-name initials.
5. Local ISO due-date creation.
6. Valid draft accepted.
7. Empty name, zero amount, excess decimal places and invalid date rejected.

## Manual end-to-end test cases

Execute these with PostgreSQL and the API running. Record Pass/Fail and the actual observed output before submission.

| ID | Steps | Expected result | Result |
|---|---|---|---|
| E2E-01 | Open app and request OTP for a valid phone | API logs a generated 6-digit code; app displays OTP step | Not run |
| E2E-02 | Enter correct OTP | Dashboard opens; session survives app refresh/restart | Not run |
| E2E-03 | Enter wrong/expired OTP | Clear error, no authenticated session | Not run |
| E2E-04 | Add a loan with valid values | Entry appears; total lent/outstanding update | Not run |
| E2E-05 | Add loan with empty name, zero amount, invalid date | Inline validation blocks save | Not run |
| E2E-06 | Attach JPEG/PNG/WebP under 5 MB and save | Network request `POST /api/loans` carries multipart `receipt`; API returns 201 and `receiptPath` | Not run |
| E2E-07 | Attach an unsupported or >5 MB file | API rejects request with 4xx; no loan is created | Not run |
| E2E-08 | Use a past due date | Row is highlighted as overdue; overdue amount includes it | Not run |
| E2E-09 | Mark pending loan repaid | Status changes, total repaid increases, overdue total excludes the loan | Not run |
| E2E-10 | Try repaying the same loan twice | Second request returns `409 ALREADY_REPAID` | Not run |
| E2E-11 | Sign in as a second phone number | First user's loans are not visible to second user | Not run |
| E2E-12 | Refresh data / use search and status filters | Loading state resolves; error/empty states and filters remain usable | Not run |
| E2E-13 | Open app at phone and desktop/web widths | Content wraps; controls stay visible and usable | Not run |

## Receipt upload verification checklist

- [ ] Verify API base URL is reachable from the exact runtime (web, emulator or physical phone).
- [ ] In browser DevTools/Expo logs confirm `POST /api/loans` fires when saving a selected receipt.
- [ ] Confirm the request is multipart form data and field key is exactly `receipt`.
- [ ] Confirm the frontend does not manually set the multipart `Content-Type` header.
- [ ] Confirm success response is HTTP 201 and returned loan has a non-null `receiptPath`.
- [ ] Request `http://<api-host>:4000/uploads/<filename>` and confirm the image is served.
- [ ] Check an unsupported file and oversized file are rejected.
- [ ] Force a database insert failure and verify a stored upload is cleaned up (covered by service unit test after it is executed).

## Security / production caveats

- OTP is intentionally a mock and printed in the API logs, as required by the assignment; no actual SMS provider is configured.
- OTP values are HMAC-hashed at rest, expire, and have an attempt limit. The assignment demo does not yet include IP-based rate limiting or a distributed limiter.
- JWTs are stored in AsyncStorage for a simple cross-platform demo. A production mobile app should use secure platform storage such as Expo SecureStore; the web build needs a browser-appropriate session strategy.
- Receipts are stored on local disk. Production deployment should use private object storage, signed access URLs, cleanup policies and malware/content scanning.
- Before deployment, set strong secrets, HTTPS, database backups, observability and deployment-specific CORS origins.

## Sign-off

Do not mark the source as fully verified until the local `npm run typechecking`, `npm test`, `npm run build:api`, database startup and manual receipt upload checks all pass. Paste their real results here after execution.


## Database environment

Use PostgreSQL installed directly on the developer machine. See [LOCAL_POSTGRESQL_WINDOWS.md](LOCAL_POSTGRESQL_WINDOWS.md) for the local database setup steps.
