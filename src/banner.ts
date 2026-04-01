import type { JsonMap, Section, WatchConfig, WatchResult } from "./types";

const DEFAULT_BASE_URL = "https://duckweb9.uoregon.edu";

export class BannerClient {
  private readonly cookieJar = new Map<string, string>();

  constructor(private readonly baseUrl = DEFAULT_BASE_URL) {}

  async checkWatch(watch: WatchConfig): Promise<WatchResult> {
    await this.bootstrapSession();
    await this.activateTerm(watch.term);

    const sections = await this.searchSections(watch);
    const matchedSections = filterSections(watch, sections);

    return {
      watch,
      sections: matchedSections,
      openSections: matchedSections.filter(isOpenSection),
    };
  }

  private async bootstrapSession() {
    await this.request("/StudentRegistrationSsb/ssb/term/termSelection?mode=search");
  }

  private async activateTerm(term: string) {
    await this.request("/StudentRegistrationSsb/ssb/term/search?mode=search", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: new URLSearchParams({
        term,
        studyPath: "",
        studyPathText: "",
        startDatepicker: "",
        endDatepicker: "",
      }).toString(),
    });
  }

  private async searchSections(watch: WatchConfig) {
    const pageSize = 500;
    let pageOffset = 0;
    let totalCount = 0;
    const sections: Section[] = [];

    do {
      const params = new URLSearchParams({
        txt_term: watch.term,
        startDatepicker: "",
        endDatepicker: "",
        pageOffset: String(pageOffset),
        pageMaxSize: String(pageSize),
        sortColumn: "subjectDescription",
        sortDirection: "asc",
      });

      for (const [key, value] of Object.entries(normalizeSearchParams(watch.search))) {
        if (Array.isArray(value)) {
          for (const item of value) {
            params.append(key, item);
          }
        } else if (value !== undefined && value !== "") {
          params.set(key, String(value));
        }
      }

      const response = (await this.requestJson(
        `/StudentRegistrationSsb/ssb/searchResults/searchResults?${params.toString()}`,
      )) as SearchResponse;

      totalCount = response.totalCount ?? 0;
      for (const item of response.data ?? []) {
        sections.push(toSection(watch.term, item));
      }
      pageOffset += pageSize;
    } while (pageOffset < totalCount);

    return sections;
  }

  private async requestJson(path: string, init?: RequestInit) {
    const response = await this.request(path, init);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${path}`);
    }
    return response.json();
  }

  private async request(path: string, init?: RequestInit) {
    const response = await fetch(new URL(path, this.baseUrl), {
      ...init,
      headers: {
        ...init?.headers,
        cookie: this.cookieHeader(),
      },
    });

    this.captureCookies(response);
    return response;
  }

  private captureCookies(response: Response) {
    const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    const headerValues = typeof getSetCookie === "function"
      ? getSetCookie.call(response.headers)
      : splitSetCookieHeader(response.headers.get("set-cookie"));

    for (const header of headerValues) {
      const [pair] = header.split(";", 1);
      const [name, ...rest] = pair.split("=");
      if (!name || rest.length === 0) {
        continue;
      }
      this.cookieJar.set(name.trim(), rest.join("=").trim());
    }
  }

  private cookieHeader() {
    return Array.from(this.cookieJar.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
  }
}

type SearchResponse = {
  totalCount?: number;
  data?: SearchResultItem[];
};

type SearchResultItem = Record<string, unknown> & {
  subject?: string;
  courseNumber?: string;
  courseTitle?: string;
  sequenceNumber?: string;
  courseReferenceNumber?: string;
  campusCode?: string;
  campusDescription?: string;
  seatsAvailable?: number;
  maximumEnrollment?: number;
  crossList?: string;
  crossListAvailable?: number;
  crossListCapacity?: number;
  waitAvailable?: number;
  waitCapacity?: number;
  openSection?: boolean;
};

function toSection(term: string, item: SearchResultItem): Section {
  return {
    id: `${term}:${String(item.courseReferenceNumber ?? "")}`,
    term,
    subject: String(item.subject ?? ""),
    courseNumber: String(item.courseNumber ?? ""),
    courseTitle: String(item.courseTitle ?? ""),
    sectionNumber: String(item.sequenceNumber ?? ""),
    courseReferenceNumber: String(item.courseReferenceNumber ?? ""),
    campusCode: toNullableString(item.campusCode),
    campusDescription: toNullableString(item.campusDescription),
    seatsAvailable: toNullableNumber(item.seatsAvailable),
    maximumEnrollment: toNullableNumber(item.maximumEnrollment),
    crossList: toNullableString(item.crossList),
    crossListAvailable: toNullableNumber(item.crossListAvailable),
    crossListCapacity: toNullableNumber(item.crossListCapacity),
    waitAvailable: toNullableNumber(item.waitAvailable),
    waitCapacity: toNullableNumber(item.waitCapacity),
    openSection: typeof item.openSection === "boolean" ? item.openSection : null,
    raw: item,
  };
}

function normalizeSearchParams(search: JsonMap) {
  const next: JsonMap = {};

  for (const [key, value] of Object.entries(search)) {
    if (value == null) {
      continue;
    }

    if (key === "subject") {
      next.txt_subject = value;
      continue;
    }

    if (key === "courseNumber") {
      next.txt_courseNumber = value;
      continue;
    }

    if (key === "crn") {
      next.txt_crn = value;
      continue;
    }

    next[key] = value;
  }

  return next;
}

export function filterSections(watch: WatchConfig, sections: Section[]) {
  const match = watch.match;
  if (!match) {
    return sections;
  }

  return sections.filter((section) => {
    if (match.crns?.length && !match.crns.includes(section.courseReferenceNumber)) {
      return false;
    }

    if (match.sectionNumbers?.length && !match.sectionNumbers.includes(section.sectionNumber)) {
      return false;
    }

    if (match.campusCodes?.length) {
      const campusCode = section.campusCode ?? "";
      if (!match.campusCodes.includes(campusCode)) {
        return false;
      }
    }

    if (match.titleIncludes?.length) {
      const haystack = section.courseTitle.toLowerCase();
      if (!match.titleIncludes.some((needle) => haystack.includes(needle.toLowerCase()))) {
        return false;
      }
    }

    return true;
  });
}

export function isOpenSection(section: Section) {
  if (section.crossList && section.crossListAvailable != null) {
    return section.crossListAvailable > 0;
  }

  if (section.openSection === true) {
    return true;
  }

  if ((section.seatsAvailable ?? 0) > 0) {
    return true;
  }

  return false;
}

function toNullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toNullableNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function splitSetCookieHeader(header: string | null) {
  if (!header) {
    return [];
  }

  return header.split(/,(?=[^;]+?=)/g);
}
