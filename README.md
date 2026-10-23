# MiniLedger

MiniLedger is a full-stack assignment/demo app for tracking money lent to friends. The API uses Node.js, TypeScript, Express and PostgreSQL. The mobile app uses React Native and Expo and can run on Android, iOS, and web.

**Demo video:** [▶ Watch the MiniLedger working demo on Google Drive](https://drive.google.com/file/d/1oShHe1ZWzPearL4X3arLwkJqt7RFzJ48/view?usp=sharing)

**Testing details:** [Read the testing report](docs/TESTING_REPORT.md). The report distinguishes automated tests included in the source from checks that were actually executed; read its status before treating the project as fully verified.

## Features

- Phone-number sign-in using a mock six-digit OTP printed in the API server terminal. No SMS is sent.
- Authenticated, account-scoped loan entries with a friend's name, amount, and due date.
- Mark a pending loan as repaid; repeated repayment requests return a conflict instead of changing the entry again.
- Summary totals for total lent, total repaid, total outstanding, and overdue amount.
- Overdue loans highlighted, status filters, friend-name search, and loading, error, empty, and refresh states.
- Optional receipt image upload (JPEG, PNG, or WebP; maximum 5 MB), stored locally by the API under `api/uploads/` and served from `/uploads`.
- Input validation and automated API/mobile helper tests.

> This is an internship assignment/demo application. OTP delivery is deliberately mocked, and receipt files are stored locally. Use secure secrets, HTTPS, rate limiting, appropriate session storage, and private object storage before production use.

## Technology and required versions

Install these tools before setting up the repository:

| Requirement | Version used/required by this project |
|---|---|
| Node.js | **22.13.0 or newer** (Node 22 LTS recommended) |
| npm | **10.9.0 or newer** |
| PostgreSQL | **13 or newer**, running locally on port `5432` unless configured otherwise |
| Expo | `~57.0.18` |
| React | `19.2.3` |
| React Native | `0.86.3` |
| TypeScript | `~5.9.3` |
| API framework | Express `^5.1.0` |
| Database driver | `pg` `^8.16.3` |
| API test runner | Vitest `^3.2.4` |

The exact dependency declarations live in the root, `api/package.json`, and `mobile/package.json` files. `npm install` at the project root installs dependencies for both workspaces. You do not need to install TypeScript, Express, React Native, or Vitest globally.

Check your Node.js and npm versions in PowerShell:

```powershell
node -v
npm -v
```

If either is older than the versions listed above, install a suitable Node.js 22 release from <https://nodejs.org/>. The installer includes npm.

## Project structure

```text
MiniLedger/
├── README.md
├── package.json                 # Workspace scripts for the API and mobile app
├── api/
│   ├── src/                      # Express routes, controllers, services and repositories
│   ├── sql/schema.sql            # Database schema and compatibility migration
│   ├── tests/                    # API unit/validation/route tests
│   ├── uploads/                  # Local receipt storage (created/used at runtime)
│   ├── .env.example
│   └── package.json
├── mobile/
│   ├── src/                      # Screens, components, API service and helpers
│   ├── App.tsx
│   ├── index.js                  # Expo entry point
│   ├── .env.example
│   └── package.json
└── docs/
    ├── LOCAL_POSTGRESQL_WINDOWS.md
    ├── TESTING_REPORT.md
    └── DEMO_SCRIPT.md
```

## Setup on Windows

The commands below are written for **PowerShell** and should be run from the project root (the folder containing `package.json`). The API and mobile app run in separate terminals.

### 1. Install project dependencies

Extract the project ZIP, open PowerShell in the extracted project folder, and confirm that `package.json` is in the current directory:

```powershell
Get-Location
Get-ChildItem package.json
npm install
```

Do not run the Expo command from a parent folder. The `dev:mobile` script changes into `mobile/` before starting Expo, where the correct Expo package and entry point are defined.

### 2. Create local environment files

Run from the project root:

```powershell
Copy-Item api/.env.example api/.env
Copy-Item mobile/.env.example mobile/.env
```

These files are local configuration. Keep `api/.env` and `mobile/.env` private and do not commit them.

### 3. Install and configure PostgreSQL

1. Download the Windows installer from the official PostgreSQL page: <https://www.postgresql.org/download/windows/>.
2. Install **PostgreSQL Server**, **pgAdmin 4**, and **Command Line Tools**. Keep port `5432` unless it is already occupied.
3. Set a password for the built-in `postgres` administrator during installation and remember it.
4. Check that the PostgreSQL Windows service is running. In PowerShell:

   ```powershell
   Get-Service *postgres*
   ```

   If the service is stopped, start it from Windows Services (`services.msc`).

5. Open **SQL Shell (psql)** from the Start menu (or run `psql` from PowerShell if it is on your PATH). Connect to the local server as the `postgres` user, using host `localhost`, port `5432`, and database `postgres`. Enter the administrator password when prompted.
6. At the `postgres=#` prompt, create an application user and database to match the sample `DATABASE_URL` in `api/.env.example`:

   ```sql
   CREATE USER miniledger WITH PASSWORD 'miniledger_dev_password';
   CREATE DATABASE miniledger OWNER miniledger;
   ```

   Then exit `psql`:

   ```text
   \q
   ```

   These commands are for a fresh local setup. If the role or database already exists, do not create it a second time; check the existing credentials and make `DATABASE_URL` match them.

7. Open `api/.env` and confirm that `DATABASE_URL` matches the user, password, database, host, and port you configured:

   ```dotenv
   DATABASE_URL=postgres://miniledger:miniledger_dev_password@localhost:5432/miniledger
   ```

   Replace the sample password if you used a different one. If your password contains reserved URL characters such as `@`, `:`, `/`, `?`, or `#`, URL-encode those characters in the URL.

8. Verify the database by connecting to `miniledger` in pgAdmin and running this in Query Tool:

   ```sql
   SELECT version();
   ```

The API applies `api/sql/schema.sql` automatically when it starts. It creates the required tables and installs `pgcrypto` where permitted. You can run the idempotent schema step manually from the project root after setting `api/.env`:

```powershell
npm run db:migrate
```

If schema setup fails specifically at `CREATE EXTENSION pgcrypto`, connect to the `miniledger` database as the local `postgres` administrator and run `CREATE EXTENSION IF NOT EXISTS pgcrypto;`, then retry the migration.

For the expanded Windows/PostgreSQL notes, see [docs/LOCAL_POSTGRESQL_WINDOWS.md](docs/LOCAL_POSTGRESQL_WINDOWS.md).

### 4. Configure API secrets

In `api/.env`, use separate random values for `JWT_SECRET` and `OTP_SECRET`. Generate a value with this PowerShell command, run it twice, and paste the two different outputs into the matching variables:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep `NODE_ENV=development` for local evaluation. The provided example secrets are placeholders for local setup; never use them in a production deployment.

### 5. Start the API server

In **Terminal 1**, from the project root:

```powershell
npm run dev:api
```

The API listens on port `4000`. The startup process runs the database schema migration automatically. Confirm that the API responds:

```powershell
Invoke-RestMethod http://localhost:4000/api/health
```

The response should contain `status: ok`. Keep this terminal running: the generated mock OTP appears in this terminal when you request one in the app.

### 6. Set the mobile app's API URL

Open `mobile/.env` (not just `.env.example`). Its `EXPO_PUBLIC_API_URL` must point to the API server and include the `/api` suffix. The example file contains a sample LAN URL; **replace the sample IP with your computer's actual LAN IPv4 address**.

Find the address in PowerShell:

```powershell
ipconfig
```

Under the active Wi-Fi or Ethernet adapter, find **IPv4 Address**. For example, if Expo prints a local development address like `exp://192.168.1.8:8081`, and that is the same computer's current LAN address, configure `mobile/.env` like this:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.8:4000/api
```

In this example, `192.168.1.8` is only a sample. Replace it with your real address. Use `http://`, the API port `4000`, and the `/api` suffix; do not use Expo's port `8081` for the API URL and do not add a trailing slash after `/api`.

Choose the URL for the environment where the app runs:

| App runtime | `EXPO_PUBLIC_API_URL` |
|---|---|
| Web opened on the same computer | `http://localhost:4000/api` |
| Default Android Studio emulator | `http://10.0.2.2:4000/api` |
| iOS simulator on the same computer | `http://localhost:4000/api` |
| Physical Android/iPhone on the same Wi-Fi | `http://YOUR_COMPUTER_LAN_IP:4000/api` |

Important notes for a physical phone:

- The phone and computer must be connected to the same Wi-Fi/LAN.
- `localhost` and `127.0.0.1` on a phone refer to the phone itself, not your computer.
- If Windows Firewall prompts for Node.js access, allow it on your **Private network**. If the phone still cannot connect, add/allow the API's port `4000` for the private network and check the URL again.
- Use Expo's LAN address only when Expo is running in LAN mode. If the address changes, update `mobile/.env` accordingly.
- The configured `EXPO_PUBLIC_API_URL` overrides the platform defaults for every runtime. If you switch between web, emulator, and physical phone, edit that value to the appropriate URL.
- If you open the **web** app from a LAN URL instead of `localhost`, also add that exact web origin to `CORS_ORIGIN` in `api/.env` (for example `http://192.168.1.8:8081`) and restart the API.

### 7. Start the mobile app

In **Terminal 2**, from the project root:

```powershell
npm run dev:mobile
```

Open the app with the Expo terminal's QR code on your phone using a compatible Expo Go client, launch an available emulator, or press `w` to open the web version. Leave both the API and Expo terminals running during testing.

If Expo reports dependency compatibility issues, run:

```powershell
cd mobile
npx expo install --check
cd ..
```

Only change dependencies if the compatibility check reports a mismatch. Avoid manually mixing arbitrary React, React Native, and Expo versions; the installed versions should remain aligned with `mobile/package.json`.

## Try the application

1. Open MiniLedger in Expo Go, an emulator, or the web preview.
2. Enter a valid phone number, such as `+919876543210`, and select **Send demo OTP**.
3. Check **Terminal 1** (the API terminal) for the logged six-digit mock OTP. Enter the actual code shown there; no SMS will arrive. Codes expire after five minutes and incorrect attempts are limited.
4. Add a loan with a friend's name, amount, and due date.
5. To demonstrate overdue handling, add a loan with a due date before today's date. It should be highlighted and included in the overdue amount.
6. Mark a pending loan as repaid. The status and summary totals should update; a repeated repayment should be rejected.
7. Optionally attach a JPEG, PNG, or WebP receipt image no larger than 5 MB.
8. Refresh or reopen the app and confirm that entries remain available after signing in again.

## Automated checks

Run these from the project root after `npm install`:

```powershell
npm run typecheck
npm run typechecking
npm test
npm run test:api
npm run test:mobile
npm run build:api
```

- `npm run typecheck` and `npm run typechecking` run TypeScript checks for the API and mobile workspaces.
- `npm test` runs both Vitest suites. `npm run test:api` and `npm run test:mobile` run one suite each.
- `npm run build:api` compiles the API TypeScript to `api/dist/`.
- Unit tests do not require a live PostgreSQL database; the interactive app flow does require a working PostgreSQL server and API.

**Test status matters:** the current [testing report](docs/TESTING_REPORT.md) says the full type checks, Vitest suites, API build, database startup, and manual end-to-end checks had **not been executed** in the report environment because dependency installation failed with a registry DNS error. Do not describe all tests as passed until you run the commands above and update the report with the actual results. The report also lists the automated cases and the manual receipt-upload checklist.

## API overview

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | No | API health check |
| `POST` | `/api/auth/request-otp` | No | Generate and log a mock OTP |
| `POST` | `/api/auth/verify-otp` | No | Verify OTP and return a JWT |
| `GET` | `/api/loans` | Bearer token | List the signed-in user's loans |
| `POST` | `/api/loans` | Bearer token | Add a loan; optional multipart field `receipt` |
| `PATCH` | `/api/loans/:id/repay` | Bearer token | Mark a pending loan as repaid |
| `GET` | `/api/summary` | Bearer token | Get the current user's summary totals |

`POST /api/loans` accepts `multipart/form-data` fields `friendName`, `amount`, `dueDate` (`YYYY-MM-DD`), and an optional `receipt` file. Total lent is the sum of all recorded loans; total repaid is the sum of repaid loans; overdue amount is the sum of pending loans whose due dates are before PostgreSQL's current date. Total outstanding is total lent minus total repaid.

## Troubleshooting

| Problem | What to check |
|---|---|
| `npm install` fails | Confirm Node.js is `22.13.0+`, npm is `10.9.0+`, and the machine has working registry/network access. Retry `npm install` after connectivity is restored. |
| API cannot connect to PostgreSQL | Check `Get-Service *postgres*`, port `5432`, that `miniledger` database exists, and that `DATABASE_URL` has the matching username/password. |
| Database schema/migration fails | Confirm the API can connect to the database and that the database user can create the schema and `pgcrypto` extension. See [the PostgreSQL setup notes](docs/LOCAL_POSTGRESQL_WINDOWS.md). |
| App says `Cannot reach the MiniLedger API` | Confirm `npm run dev:api` is running, `/api/health` works, and `EXPO_PUBLIC_API_URL` is correct for web, emulator, or phone. Restart Expo after changing `.env`. |
| Physical phone cannot connect | Use the computer's current LAN IPv4 address, not `localhost`; place both devices on the same Wi-Fi and check private-network firewall permissions. |
| OTP invalid or expired | Request a fresh OTP and enter the latest code printed in the API terminal. |
| Receipt upload fails | Use JPEG, PNG, or WebP under 5 MB; check that the device can reach the API and that `api/uploads/` is writable. A successful create response is HTTP `201`. |
| Old database reports `receipt_path` missing | Stop the API, run `npm run db:migrate` from the root, then start it again. The schema migrates older `receipt_url` columns to `receipt_path` where required. |
| Expo cache/bundle issue | Stop Expo with `Ctrl+C`, then run `npm run dev:mobile` again. The root script starts Expo with a cleared cache. |

## Assignment coverage

| Assignment requirement | MiniLedger implementation |
|---|---|
| Phone login with mock OTP | API logs a generated six-digit code; app verifies it and stores the returned session token |
| Add loan entries | Friend name, amount, due date, optional receipt |
| Mark entry repaid | Repayment endpoint and UI action |
| Summary endpoint/card | Total lent, total repaid, overdue amount, and outstanding |
| Mobile list and overdue highlighting | Expo React Native dashboard, filters, and overdue styling |
| Validation and basic tests | API validation/service tests and mobile helper tests included |

## Helpful project docs

- [Testing report and current verification status](docs/TESTING_REPORT.md)
- [Local PostgreSQL setup for Windows](docs/LOCAL_POSTGRESQL_WINDOWS.md)


