export type JsonMap = Record<string, string | number | boolean | string[] | undefined>;

export type WatchMatch = {
  crns?: string[];
  sectionNumbers?: string[];
  campusCodes?: string[];
  titleIncludes?: string[];
};

export type WatchConfig = {
  id: string;
  label?: string;
  term: string;
  search: JsonMap;
  match?: WatchMatch;
};

export type NtfyConfig = {
  baseUrl?: string;
  topic: string;
  token?: string;
  priority?: string;
  tags?: string[];
  titlePrefix?: string;
};

export type WebhookConfig = {
  url: string;
  headers?: Record<string, string>;
};

export type TwilioConfig = {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
};

export type SelfPingConfig = {
  apiKey?: string;
  apiKeyEnv?: string;
};

export type NotifyConfig = {
  ntfy?: NtfyConfig;
  webhook?: WebhookConfig;
  twilio?: TwilioConfig;
  selfPing?: SelfPingConfig;
  command?: string;
};

export type AppConfig = {
  baseUrl?: string;
  pollIntervalSeconds?: number;
  stateFile?: string;
  notifyInitially?: boolean;
  notify?: NotifyConfig;
  watches: WatchConfig[];
};

export type Section = {
  id: string;
  term: string;
  subject: string;
  courseNumber: string;
  courseTitle: string;
  sectionNumber: string;
  courseReferenceNumber: string;
  campusCode?: string | null;
  campusDescription?: string | null;
  seatsAvailable?: number | null;
  maximumEnrollment?: number | null;
  crossList?: string | null;
  crossListAvailable?: number | null;
  crossListCapacity?: number | null;
  waitAvailable?: number | null;
  waitCapacity?: number | null;
  openSection?: boolean | null;
  raw: Record<string, unknown>;
};

export type WatchResult = {
  watch: WatchConfig;
  sections: Section[];
  openSections: Section[];
};

export type WatchState = {
  openCrns: string[];
};

export type TrackerState = {
  watches: Record<string, WatchState>;
};
