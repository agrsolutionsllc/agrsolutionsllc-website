# AGR CRM Local Server

This folder is the local data-server prototype for AGR Solutions LLC.

## Goal
Move AGR CRM data from browser localStorage into PostgreSQL on Ariana's Windows PC, while keeping the current CRM untouched until testing is complete.

## Current architecture
- CRM UI: existing `crm-v18`
- Local server: Node.js + Express
- Database: PostgreSQL
- Database access: localhost only (`127.0.0.1`)
- Primary state: one JSONB row in `crm_state`
- Backup target: external Seagate drive using `scripts/backup.ps1`

## Windows setup
1. Install PostgreSQL for Windows and include pgAdmin.
2. Install Node.js LTS.
3. Create database `agr_crm` and database user `agr_crm` with a strong password.
4. Run `db/schema.sql` in the `agr_crm` database.
5. Copy `.env.example` to `.env` and enter the database password and external backup path.
6. From this folder run:
   - `npm install`
   - `npm start`
7. Open `http://127.0.0.1:8787/api/health` to confirm database connectivity.
8. Open `http://127.0.0.1:8787/` to load the local CRM copy.

## Safety
Do not delete browser localStorage or switch the production CRM away from localStorage until the migration test has been verified and a backup has been created.

## Next development step
Add the synchronization adapter that imports the current `agr-crm-demo-v1` localStorage state into PostgreSQL, then makes PostgreSQL the source of truth in this server branch only.
