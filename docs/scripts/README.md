# Scheduled scripts (Raspberry Pi)

The dashboard has a few jobs that must run on a schedule (FX-rate refresh, Trading212 sync,
recurring auto-post). They live in [`scripts/`](../../scripts/) and run on a Raspberry Pi
(reachable over Tailscale as `pi@100.72.194.100`) via systemd timers, managed by the `bd`
command. The Pi follows the `main` branch: **merge to `main`, then `bd update` on the Pi.**

Day-to-day usage on the Pi: [`scripts/pi/README.md`](../../scripts/pi/README.md) (also at
`~/budget/README.md` on the Pi).

## Layout

| Path | What |
|------|------|
| `scripts/*.py` | The jobs. Each runs **once** and exits. |
| `scripts/_common.py` | Shared helpers: `env()` (required env var), `post()` (HTTP POST, exit 1 on failure), `logger`. |
| `scripts/requirements.txt` | Dependencies for all jobs (one shared venv on the Pi). |
| `scripts/pi/jobs.conf` | Which script runs when. Source of truth for the schedule. |
| `scripts/pi/bd` | The management CLI (bash). Generates systemd units from `jobs.conf`. |
| `scripts/pi/env.example` | Every env var the jobs need, with placeholder values. |

On the Pi:

```
~/budget/
├── .env      real secrets (chmod 600), loaded by systemd into every job
├── .venv/    shared venv, built from requirements.txt by `bd update`
└── repo/     sparse clone of this repo (scripts/ only), branch main
```

| Job | Script | Schedule | Calls |
|-----|--------|----------|-------|
| `recurring` | `post_recurring.py` | daily 05:00 | `POST /recurring/post-due` (backend) |
| `fx` | `refresh_exchange_rates.py` | daily 06:00 | `refresh-exchange-rates` Edge Function |
| `trading` | `sync_trading212.py` | every 30 min | `POST /trading212/sync-all` (backend) |

Times are Europe/Prague (the Pi's timezone).

## Rules for a job script

- **Run once, then exit.** No `while True` / `schedule` loops — the timer handles timing.
- **Exit non-zero on failure** so `bd status` shows FAILED. `_common.post()` already does this;
  otherwise `sys.exit(1)`.
- **No secrets in code.** The repo is public. Read config with `env("NAME")`, and add every new
  variable to `scripts/pi/env.example`.
- **Safe to re-run.** A missed run is caught up after boot and `bd run` can fire it anytime, so
  running twice must not do anything twice (the existing endpoints are idempotent).
- Log with `logger.info(...)` / `logger.error(...)` to stdout; journald stores it.
- Extra packages go in `scripts/requirements.txt`.

## Adding a job

1. Create `scripts/my_job.py`:
   ```python
   """What it does. Env: BACKEND_URL, BACKEND_API_KEY, JOB_SECRET."""

   from _common import env, logger, post


   def main() -> None:
       base = env("BACKEND_URL").rstrip("/")
       data = post(
           f"{base}/some/endpoint",
           headers={"X-API-KEY": env("BACKEND_API_KEY"), "X-Job-Secret": env("JOB_SECRET")},
           timeout=120,  # Render may be cold-starting
       )
       logger.info(f"Done — {data}")


   if __name__ == "__main__":
       main()
   ```
2. Add a line to `scripts/pi/jobs.conf`: `my-job   my_job.py   07:00`.
   The schedule is a systemd
   [`OnCalendar`](https://www.freedesktop.org/software/systemd/man/latest/systemd.time.html#Calendar%20Events)
   expression (`06:00`, `*:0/30`, `hourly`, `Mon *-*-* 08:00`, …). `bd update` rejects invalid ones.
3. New env vars → `scripts/pi/env.example`.
4. Merge to `main`. On the Pi: `bd env` (add the new keys) → `bd update` → `bd run my-job`.

Changing a schedule or removing a job works the same way: edit `jobs.conf`, merge, `bd update`.

## Running a job locally (PC)

```powershell
cd scripts
pip install -r requirements.txt
$env:BACKEND_URL="http://localhost:8000"; $env:BACKEND_API_KEY="..."; $env:JOB_SECRET="..."
python post_recurring.py
```

## Operating the Pi (for agents)

You can SSH in non-interactively: `ssh -o BatchMode=yes pi@100.72.194.100 '<cmd>'`.
In non-login shells `~/.local/bin` isn't on `PATH`, so call `~/.local/bin/bd …` there.

- Check health: `~/.local/bin/bd status`, then `bd logs <job>` for anything FAILED.
- Deploy merged changes: `~/.local/bin/bd update`.
- Never print or copy `~/budget/.env` — it holds live secrets.
- Don't edit files under `~/budget/repo` or `~/.config/systemd/user/bd-*` by hand; both are
  overwritten by `bd update`.

How `bd` works: for each line in `jobs.conf` it writes `~/.config/systemd/user/bd-<job>.service`
(oneshot: `~/budget/.venv/bin/python scripts/<script>` with `EnvironmentFile=~/budget/.env`) and
`bd-<job>.timer` (`OnCalendar=<schedule>`, `Persistent=true`), enables timers for new jobs,
restarts existing enabled ones (so schedule changes apply without un-pausing paused jobs), and
removes units whose job is gone. User lingering (`loginctl enable-linger pi`, done by
`bd install`) keeps the timers running without a login session. Logs live in the journal
(`journalctl --user-unit bd-<job>.service`), which is in-memory on this Pi, so they're cleared on reboot.
