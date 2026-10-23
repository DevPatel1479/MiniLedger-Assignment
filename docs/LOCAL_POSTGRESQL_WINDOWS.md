# Local PostgreSQL setup on Windows

1. Download PostgreSQL from <https://www.postgresql.org/download/windows/>.
2. Install PostgreSQL Server, pgAdmin 4, and Command Line Tools. Keep port `5432` unless it is already in use. Set a password for the `postgres` administrator and remember it.
3. Check the service in PowerShell:

   ```powershell
   Get-Service *postgres*
   ```

   Start the PostgreSQL service from Windows Services (`services.msc`) if it is stopped.
4. Open **SQL Shell (psql)** from the Start menu, connect to host `localhost`, port `5432`, database `postgres`, and user `postgres`, then enter the administrator password.
5. For a fresh local setup, create a database user and database matching `api/.env.example`:

   ```sql
   CREATE USER miniledger WITH PASSWORD 'miniledger_dev_password';
   CREATE DATABASE miniledger OWNER miniledger;
   ```

   Exit the shell with `\q`. If the user/database already exists, use the existing credentials or update `DATABASE_URL` rather than creating duplicates.
6. Copy environment examples from the project root if you have not already:

   ```powershell
   Copy-Item api/.env.example api/.env
   Copy-Item mobile/.env.example mobile/.env
   ```

7. In `api/.env`, set `DATABASE_URL` to the credentials you configured. For the sample SQL above:

   ```dotenv
   DATABASE_URL=postgres://miniledger:miniledger_dev_password@localhost:5432/miniledger
   ```

   Replace the sample password if you used another one. URL-encode reserved characters in passwords when placing them in a connection URL.
8. In pgAdmin, connect to the `miniledger` database, open Query Tool, and run `SELECT version();` to verify PostgreSQL responds.
9. From the project root, run `npm run db:migrate` to apply `api/sql/schema.sql`. The API also runs the idempotent schema migration automatically at startup.

If schema setup fails specifically at `CREATE EXTENSION pgcrypto`, connect to `miniledger` as the local `postgres` administrator in pgAdmin and run `CREATE EXTENSION IF NOT EXISTS pgcrypto;`, then rerun the migration.

## Troubleshooting

- Check the service name using `Get-Service *postgres*`.
- Check whether PostgreSQL is listening on its configured port with `Get-NetTCPConnection -LocalPort 5432 -State Listen`.
- If port `5432` is already occupied, use the actual port in `DATABASE_URL`.
- Ensure the `miniledger` database exists and the `DATABASE_URL` user/password match the database credentials.
