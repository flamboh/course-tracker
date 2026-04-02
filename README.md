# course-tracker

Polls UO Banner class search. Notifies on closed -> open seat transitions.

Cross-listed courses: tracker uses shared cross-list availability when Banner exposes it.

## flow

Uses public Banner endpoints:

- `GET /ssb/term/termSelection?mode=search`
- `POST /ssb/term/search?mode=search`
- `GET /ssb/searchResults/searchResults?...`

No browser. No auth.

## setup

```bash
cp tracker.config.example.json tracker.config.json
```

Edit `tracker.config.json`.

Common search keys:

- `subject` -> `txt_subject`
- `courseNumber` -> `txt_courseNumber`
- `crn` -> `txt_crn`
- any raw Banner key also works

Optional narrowing:

- `match.crns`
- `match.sectionNumbers`
- `match.campusCodes`
- `match.titleIncludes`

## run

One check:

```bash
bun run src/index.ts --once --dry-run --verbose
```

Loop forever:

```bash
bun run src/index.ts
```

Server setup:

```bash
curl -fsSL https://bun.sh/install | bash
git clone <your-repo-url> ~/course-tracker
cd ~/course-tracker
cp tracker.config.example.json tracker.config.json
cp ops/course-tracker.env.example ops/course-tracker.env
```

Edit:

- `tracker.config.json`
- `ops/course-tracker.env`

Smoke test:

```bash
source ops/course-tracker.env
bun run src/index.ts --once --dry-run --verbose
```

Install `systemd` service:

```bash
cp ops/course-tracker.service.example /tmp/course-tracker.service
# edit User, WorkingDirectory, EnvironmentFile if needed
sudo mv /tmp/course-tracker.service /etc/systemd/system/course-tracker.service
sudo systemctl daemon-reload
sudo systemctl enable --now course-tracker
sudo systemctl status course-tracker
```

Logs:

```bash
sudo journalctl -u course-tracker -f
```
