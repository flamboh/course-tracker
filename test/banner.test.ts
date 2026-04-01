import { describe, expect, test } from "bun:test";
import { filterSections, isOpenSection } from "../src/banner";
import { diffOpenSections } from "../src/state";
import type { Section, TrackerState, WatchConfig } from "../src/types";

const watch: WatchConfig = {
  id: "cs-415",
  term: "202503",
  search: { subject: "CS", courseNumber: "415" },
};

const baseSection: Section = {
  id: "202503:12345",
  term: "202503",
  subject: "CS",
  courseNumber: "415",
  courseTitle: "Test Course",
  sectionNumber: "001",
  courseReferenceNumber: "12345",
  seatsAvailable: 0,
  maximumEnrollment: 30,
  crossList: null,
  crossListAvailable: null,
  crossListCapacity: null,
  waitAvailable: 0,
  waitCapacity: 0,
  campusCode: "EUG",
  campusDescription: "Eugene",
  openSection: false,
  raw: {},
};

describe("isOpenSection", () => {
  test("true when seats available", () => {
    expect(isOpenSection({ ...baseSection, seatsAvailable: 2 })).toBe(true);
  });

  test("true when openSection flag set", () => {
    expect(isOpenSection({ ...baseSection, openSection: true })).toBe(true);
  });

  test("false when both closed", () => {
    expect(isOpenSection(baseSection)).toBe(false);
  });

  test("false when cross-list is full", () => {
    expect(
      isOpenSection({
        ...baseSection,
        seatsAvailable: 10,
        maximumEnrollment: 30,
        crossList: "0861",
        crossListAvailable: 0,
        crossListCapacity: 30,
        openSection: true,
      }),
    ).toBe(false);
  });
});

describe("filterSections", () => {
  test("filters by crn and campus", () => {
    const sections = [
      baseSection,
      { ...baseSection, id: "2", courseReferenceNumber: "99999", campusCode: "PDX" },
    ];

    const filtered = filterSections(
      {
        ...watch,
        match: { crns: ["12345"], campusCodes: ["EUG"] },
      },
      sections,
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.courseReferenceNumber).toBe("12345");
  });
});

describe("diffOpenSections", () => {
  test("suppresses initial notify by default", () => {
    const state: TrackerState = { watches: {} };
    const diff = diffOpenSections(
      {
        watch,
        sections: [baseSection],
        openSections: [{ ...baseSection, seatsAvailable: 1 }],
      },
      state,
      false,
    );

    expect(diff.shouldNotify).toBe(false);
  });

  test("notifies on new opening", () => {
    const state: TrackerState = {
      watches: {
        [watch.id]: { openCrns: [] },
      },
    };

    const diff = diffOpenSections(
      {
        watch,
        sections: [baseSection],
        openSections: [{ ...baseSection, seatsAvailable: 1 }],
      },
      state,
      false,
    );

    expect(diff.shouldNotify).toBe(true);
    expect(diff.newOpenSections).toHaveLength(1);
  });
});
