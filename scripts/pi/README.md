# Budget jobs on this Pi

Scheduled scripts for the budgeting dashboard. Everything is controlled with the `bd` command.
(This file is `~/budget/README.md`; it's the same file as `scripts/pi/README.md` in the repo.)

## Everyday commands

```bash
bd status              # all jobs: did the last run work, when, and when is the next run
bd run fx              # run one job now and see its output
bd run all             # run every job now
bd logs trading        # last 50 log lines of a job
bd logs trading 200    # last 200 lines
bd logs trading -f     # follow live (Ctrl+C to stop)
bd pause trading       # stop running it on schedule (bd run still works)
bd resume trading      # back on schedule
bd env                 # edit the keys (Ctrl+O, Enter to save, Ctrl+X to quit nano)
bd update              # pull the newest scripts from GitHub and apply jobs.conf
bd help
```

Jobs right now (exact list and times: `bd status`):

| Job | What it does | When |
|-----|--------------|------|
| `recurring` | auto-posts due recurring transactions | daily 05:00 |
| `fx` | refreshes exchange rates | daily 06:00 |
| `trading` | syncs Trading212 portfolios | every 3 hours (00:00, 03:00, …) |

## Where things are

```
~/budget/
├── README.md   → this file
├── .env        your keys (private, not in git) — edit with `bd env`
├── .venv/      Python environment shared by all jobs (managed by bd, don't touch)
└── repo/       read-only copy of the GitHub repo (main branch, scripts/ only)
```

Don't edit files in `repo/` on the Pi. Change things on the PC, merge to `main`, then run `bd update` here.

## Adding or changing a job

1. On the PC: add the script to `scripts/` and a line to `scripts/pi/jobs.conf`
   (details in `docs/scripts/README.md`). If it needs a new key, add it to `scripts/pi/env.example`.
2. Merge to `main`.
3. On the Pi: `bd env` (add any new keys), then `bd update`, then `bd run <job>` to check it works.

Changing a time = edit its line in `jobs.conf` and do steps 2–3. Removing a line removes the job.

## When something's wrong

- `bd status` shows **FAILED** → `bd logs <job>` shows the error.
  - `Missing environment variable X` → `bd env`, add `X=...`.
  - `HTTP 401/403` → a key in `.env` is wrong or outdated.
  - `Request failed: ... timed out` → backend was asleep/down; it retries on the next run.
- A failed run doesn't stop the schedule — the next run happens as normal.
- If the Pi was off at a job's time, the job runs right after it boots.
- Logs are kept in memory only, so they're cleared on reboot.

## Setting up from scratch (new Pi / SD card)

```bash
git clone --filter=blob:none --sparse https://github.com/OndrejKutil/budgeting_dashboard.git ~/budget/repo
git -C ~/budget/repo sparse-checkout set scripts
~/budget/repo/scripts/pi/bd install    # asks for sudo once
bd env                                 # fill in the keys
bd run all
```

Under the hood each job is a systemd user timer + service named `bd-<job>`
(`systemctl --user list-timers 'bd-*'`). `bd` generates them from `jobs.conf`, so don't edit them by hand.
