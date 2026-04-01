import type { NotifyConfig, Section, WatchConfig } from "./types";

export async function sendNotification(
  notify: NotifyConfig | undefined,
  watch: WatchConfig,
  sections: Section[],
  dryRun: boolean,
) {
  const message = buildMessage(watch, sections);
  const title = buildTitle(watch, sections.length);

  if (dryRun || !notify) {
    console.log(`[notify] ${title}`);
    console.log(message);
    return;
  }

  if (notify.ntfy) {
    await sendNtfy(notify.ntfy, title, message);
  }

  if (notify.webhook) {
    await sendWebhook(notify.webhook, title, message, watch, sections);
  }

  if (notify.twilio) {
    await sendTwilio(notify.twilio, title, message);
  }

  if (notify.selfPing) {
    await sendSelfPing(notify.selfPing, title, message);
  }

  if (notify.command) {
    await sendCommand(notify.command, title, message, watch, sections);
  }
}

function buildTitle(watch: WatchConfig, openCount: number) {
  return `${watch.label ?? watch.id}: ${openCount} seat${openCount === 1 ? "" : "s"} open`;
}

function buildMessage(watch: WatchConfig, sections: Section[]) {
  const lines = [
    `${watch.label ?? watch.id} open`,
    `term ${watch.term}`,
    ...sections.map((section) =>
      `${section.subject} ${section.courseNumber}-${section.sectionNumber} CRN ${section.courseReferenceNumber} seats ${seatSummary(section)}${section.campusDescription ? ` ${section.campusDescription}` : ""}`,
    ),
  ];

  return lines.join("\n");
}

function seatSummary(section: Section) {
  if (section.crossList && section.crossListAvailable != null) {
    return `${section.crossListAvailable}/${section.crossListCapacity ?? "?"} cross-list`;
  }

  return `${section.seatsAvailable ?? "?"}/${section.maximumEnrollment ?? "?"}`;
}

async function sendNtfy(
  config: NonNullable<NotifyConfig["ntfy"]>,
  title: string,
  message: string,
) {
  const baseUrl = config.baseUrl ?? "https://ntfy.sh";
  const headers: Record<string, string> = {
    title: config.titlePrefix ? `${config.titlePrefix} ${title}` : title,
  };

  if (config.priority) {
    headers.priority = config.priority;
  }

  if (config.tags?.length) {
    headers.tags = config.tags.join(",");
  }

  if (config.token) {
    headers.authorization = `Bearer ${config.token}`;
  }

  const response = await fetch(new URL(config.topic, baseUrl), {
    method: "POST",
    headers,
    body: message,
  });

  if (!response.ok) {
    throw new Error(`ntfy failed: HTTP ${response.status}`);
  }
}

async function sendWebhook(
  config: NonNullable<NotifyConfig["webhook"]>,
  title: string,
  message: string,
  watch: WatchConfig,
  sections: Section[],
) {
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...config.headers,
    },
    body: JSON.stringify({
      title,
      message,
      watch,
      sections,
    }),
  });

  if (!response.ok) {
    throw new Error(`webhook failed: HTTP ${response.status}`);
  }
}

async function sendCommand(
  command: string,
  title: string,
  message: string,
  watch: WatchConfig,
  sections: Section[],
) {
  const proc = Bun.spawn({
    cmd: ["sh", "-lc", command],
    env: {
      ...process.env,
      TRACKER_TITLE: title,
      TRACKER_MESSAGE: message,
      TRACKER_WATCH_ID: watch.id,
      TRACKER_WATCH_LABEL: watch.label ?? watch.id,
      TRACKER_TERM: watch.term,
      TRACKER_OPEN_SECTIONS_JSON: JSON.stringify(sections),
    },
    stdout: "inherit",
    stderr: "inherit",
  });

  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`notify command failed: exit ${code}`);
  }
}

async function sendTwilio(
  config: NonNullable<NotifyConfig["twilio"]>,
  title: string,
  message: string,
) {
  const body = new URLSearchParams({
    To: config.to,
    From: config.from,
    Body: `${title}\n${message}`,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${btoa(`${config.accountSid}:${config.authToken}`)}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  if (!response.ok) {
    throw new Error(`twilio failed: HTTP ${response.status}`);
  }
}

async function sendSelfPing(
  config: NonNullable<NotifyConfig["selfPing"]>,
  title: string,
  message: string,
) {
  const apiKey = config.apiKey ?? process.env[config.apiKeyEnv ?? "SELFPING_API_KEY"];
  if (!apiKey) {
    throw new Error("selfPing failed: missing API key");
  }

  const response = await fetch("https://www.selfping.com/api/sms", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      message: `${title}\n${message}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`selfPing failed: HTTP ${response.status}`);
  }
}
