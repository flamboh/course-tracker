import { BannerClient } from "./banner";
import { loadConfig } from "./config";
import { sendNotification } from "./notifier";
import { diffOpenSections, loadState, saveState } from "./state";

type CliOptions = {
  configPath?: string;
  once: boolean;
  dryRun: boolean;
  verbose: boolean;
};

const options = parseArgs(process.argv.slice(2));
const { config, path: configPath } = await loadConfig(options.configPath);
const { path: statePath, state } = await loadState(config.stateFile);
const client = new BannerClient(config.baseUrl);

log(`config ${configPath}`);
log(`state ${statePath}`);

if (options.once) {
  await runCycle();
} else {
  const intervalMs = Math.max(15, config.pollIntervalSeconds ?? 60) * 1000;
  while (true) {
    await runCycle();
    log(`sleep ${intervalMs / 1000}s`);
    await Bun.sleep(intervalMs);
  }
}

async function runCycle() {
  log("cycle start");

  for (const watch of config.watches) {
    try {
      const result = await client.checkWatch(watch);
      const diff = diffOpenSections(result, state, config.notifyInitially ?? false);

      log(
        `${watch.id} matched=${result.sections.length} open=${result.openSections.length}`,
      );

      if (options.verbose) {
        for (const section of result.sections) {
          log(
            `${watch.id} ${section.subject} ${section.courseNumber}-${section.sectionNumber} crn=${section.courseReferenceNumber} seats=${describeSeats(section)}`,
          );
        }
      }

      if (diff.shouldNotify) {
        await sendNotification(config.notify, watch, diff.newOpenSections, options.dryRun);
      }
    } catch (error) {
      console.error(`[${timestamp()}] ${watch.id} error`, error);
    }
  }

  await saveState(statePath, state);
  log("cycle end");
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    once: false,
    dryRun: false,
    verbose: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--config") {
      options.configPath = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--once") {
      options.once = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--verbose") {
      options.verbose = true;
      continue;
    }
    throw new Error(`Unknown arg: ${arg}`);
  }

  return options;
}

function timestamp() {
  return new Date().toISOString();
}

function log(message: string) {
  console.log(`[${timestamp()}] ${message}`);
}

function describeSeats(section: {
  seatsAvailable?: number | null;
  maximumEnrollment?: number | null;
  crossList?: string | null;
  crossListAvailable?: number | null;
  crossListCapacity?: number | null;
}) {
  if (section.crossList && section.crossListAvailable != null) {
    return `${section.crossListAvailable ?? "?"}/${section.crossListCapacity ?? "?"} cross-list`;
  }

  return `${section.seatsAvailable ?? "?"}/${section.maximumEnrollment ?? "?"}`;
}
