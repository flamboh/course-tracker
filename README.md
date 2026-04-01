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

## notifications

Supports any mix of:

- `notify.ntfy`
- `notify.webhook`
- `notify.twilio`
- `notify.selfPing`
- `notify.command`

Current local config expects `SELFPING_API_KEY`.

SMS via email:

- not iCloud
- AT&T shut this down on June 17, 2025
- official AT&T notice: [Say Goodbye to Email-to-Text and Text-to-Email](https://www.att.com/support/article/wireless/KM1061254/)

Twilio example:

```json
{
  "notify": {
    "twilio": {
      "accountSid": "AC...",
      "authToken": "secret",
      "from": "+15551234567",
      "to": "+19073104429"
    }
  }
}
```

SelfPing example:

```json
{
  "notify": {
    "selfPing": {
      "apiKeyEnv": "SELFPING_API_KEY"
    }
  }
}
```

Same pattern as [submit-pizza-order.ts](/Users/olive/Code/pizza-time/src/actions/submit-pizza-order.ts) in `~/Code/pizza-time`.

`notify.command` gets env vars:

- `TRACKER_TITLE`
- `TRACKER_MESSAGE`
- `TRACKER_WATCH_ID`
- `TRACKER_WATCH_LABEL`
- `TRACKER_TERM`
- `TRACKER_OPEN_SECTIONS_JSON`

Example:

```json
{
  "notify": {
    "command": "mail -s \"$TRACKER_TITLE\" oliver@example.com <<< \"$TRACKER_MESSAGE\""
  }
}
```

## notes

- first run seeds state by default; no startup spam
- later open transitions notify once
- state stored in `state/tracker-state.json`

## ubuntu

Real SMS check:

- SelfPing API accepted a live test on April 1, 2026 with `200` and `SMS sent successfully`

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
