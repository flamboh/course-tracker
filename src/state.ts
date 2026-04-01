import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { TrackerState, WatchResult } from "./types";

const EMPTY_STATE: TrackerState = { watches: {} };

export async function loadState(pathArg?: string): Promise<{ path: string; state: TrackerState }> {
  const path = resolve(process.cwd(), pathArg ?? "state/tracker-state.json");
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return { path, state: structuredClone(EMPTY_STATE) };
  }
  const json = (await file.json()) as TrackerState;
  return { path, state: json?.watches ? json : structuredClone(EMPTY_STATE) };
}

export async function saveState(path: string, state: TrackerState) {
  mkdirSync(dirname(path), { recursive: true });
  await Bun.write(path, `${JSON.stringify(state, null, 2)}\n`);
}

export function diffOpenSections(
  result: WatchResult,
  state: TrackerState,
  notifyInitially: boolean,
) {
  const prev = state.watches[result.watch.id];
  const nextOpenCrns = result.openSections.map((section) => section.courseReferenceNumber).sort();
  const prevOpenCrns = prev?.openCrns ?? [];

  const newOpenCrns = nextOpenCrns.filter((crn) => !prevOpenCrns.includes(crn));
  const shouldNotify =
    prev != null ? newOpenCrns.length > 0 : notifyInitially && nextOpenCrns.length > 0;

  state.watches[result.watch.id] = { openCrns: nextOpenCrns };

  return {
    shouldNotify,
    newOpenSections: result.openSections.filter((section) =>
      prev == null ? notifyInitially : newOpenCrns.includes(section.courseReferenceNumber),
    ),
  };
}
