# Database backups

Supabase's free plan has no automated backups, and free projects pause after a
week without activity. The workflow in `.github/workflows/db-backup.yml` covers
both: every Monday and Thursday it dumps the database, encrypts the dump and
stores it as a GitHub Actions artifact for 30 days.

What is backed up: the app's tables (`public`) and the sign-in accounts
(`auth.users`, `auth.identities`). **Photos are not included.** They live in
Supabase Storage (the `trip-photos` and `avatars` buckets) and need their own
copy if you want them protected.

## One-time setup

1. In Supabase: **Connect** (top of the dashboard) → **Session pooler** → copy the connection string.
   Replace `[YOUR-PASSWORD]` with the database password (reset it under
   Project Settings → Database if you don't have it). Use the *session pooler*
   string: GitHub's runners can't reach the direct connection over IPv6.
2. In GitHub: repository → Settings → Secrets and variables → Actions → New repository secret:
   - `SUPABASE_DB_URL`: the connection string from step 1
   - `BACKUP_PASSPHRASE`: a long random passphrase. Store it in a password manager; without it the backups can't be opened.
3. Actions tab → **Database backup** → Run workflow, and check it succeeds.

Backups are encrypted, so they are safe even if the repository is public, but
keeping the repository private is still the better choice.

## Download and test a restore (do this once before relying on it)

1. Actions → the latest **Database backup** run → download the `database-backup` artifact and unzip it.
2. Decrypt:
   ```
   gpg --output backup.dump --decrypt backup-YYYYMMDD-HHMM.dump.gpg
   ```
3. Restore into an empty **test** project (never straight into production):
   ```
   pg_restore --no-owner --no-privileges --clean --if-exists -d "<test project connection string>" backup.dump
   ```
4. Check that the tables have rows (`trips`, `trip_photos`, `published_memories`).

A restore needs the same migrations applied first (`supabase db push` on the test project), so the schema matches.
