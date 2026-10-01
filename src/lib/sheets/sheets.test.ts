import { describe, expect, it } from "vitest";
import { isAgendaStillLoading, parseAgenda } from "./agenda";
import { cellString, parseIndonesianDate, roomKey } from "./cells";
import { parseSessionCell, parseTimetable, parseTimetableBlock, TIMETABLE_BLOCKS } from "./timetable";

describe("cellString", () => {
  it("reads strings, numbers and holes as trimmed text", () => {
    const row = ["  L 7.3.2 ", 12, null, undefined, true, "a b"];
    expect(cellString(row, 0)).toBe("L 7.3.2");
    expect(cellString(row, 1)).toBe("12");
    expect(cellString(row, 2)).toBe("");
    expect(cellString(row, 3)).toBe("");
    expect(cellString(row, 4)).toBe("true");
    expect(cellString(row, 5)).toBe("a b");
    expect(cellString(row, 99)).toBe("");
  });
});

describe("roomKey", () => {
  it("ignores spacing and case", () => {
    expect(roomKey("L 7.3.2")).toBe("L7.3.2");
    expect(roomKey("l7.3.2")).toBe("L7.3.2");
    expect(roomKey("L 7.3.2")).toBe("L7.3.2");
  });
});

describe("parseIndonesianDate", () => {
  it("parses '20 Januari 2026'", () => {
    expect(parseIndonesianDate("20 Januari 2026")).toBe("2026-01-20");
    expect(parseIndonesianDate("1 desember 2025")).toBe("2025-12-01");
  });

  it("rejects anything else", () => {
    expect(parseIndonesianDate("31 Februari 2026")).toBeNull();
    expect(parseIndonesianDate("20 Jan 2026")).toBeNull();
    expect(parseIndonesianDate("2026-01-20")).toBeNull();
    expect(parseIndonesianDate("")).toBeNull();
  });
});

describe("parseSessionCell", () => {
  it("reads the three-part and two-part shapes", () => {
    expect(parseSessionCell("Basis Data | 22-IF-01 | Dosen A")).toEqual({
      status: "planned",
      course: "Basis Data",
      className: "22-IF-01",
      lecturer: "Dosen A",
    });
    expect(parseSessionCell("Basis Data | Dosen A")).toEqual({
      status: "planned",
      course: "Basis Data",
      className: "",
      lecturer: "Dosen A",
    });
  });

  it("detects empty, booked and conflicting slots", () => {
    expect(parseSessionCell("  ").status).toBe("empty");
    expect(parseSessionCell("booked | Ujian").status).toBe("booked");
    expect(parseSessionCell("Basis Data - XX | Dosen A").status).toBe("conflict");
  });
});

describe("parseTimetable", () => {
  it("keeps the last row of a repeated room and skips rows without a code", () => {
    const rooms = parseTimetableBlock([
      ["L 7.3.1", "A | Dosen A"],
      ["", "ignored"],
      ["L  7.3.1", "", "B | Dosen B"],
      ["S 2.2.8"],
    ]);
    expect(rooms.map((r) => r.code)).toEqual(["L 7.3.1", "S 2.2.8"]);
    const l731 = rooms[0];
    expect(l731.sessions.map((s) => s.status)).toEqual(["empty", "planned", "empty", "empty", "empty"]);
    expect(l731.sessions[1].course).toBe("B");
  });

  it("returns one day per block, Monday to Friday", () => {
    const days = parseTimetable([[["L 2.2.1", "X | Y"]]]);
    expect(days.map((d) => d.weekday)).toEqual(TIMETABLE_BLOCKS.map((b) => b.weekday));
    expect(days[0].rooms).toHaveLength(1);
    expect(days[4].rooms).toHaveLength(0);
  });
});

const HEADER = ["NO", "TGL INPUT", "EMAIL", "HARI", "TANGGAL", "JAM", "WKT", "LAB", "SOFTWARE", "MATKUL", "PRODI", "KELAS", "PEMINJAM", "KET"];

function agendaRow(no: string, date: string, time: string, lab: string, extra: Partial<Record<"course" | "prodi" | "notes", string>> = {}) {
  return [no, "08-01-26", "someone@example.test", "Selasa", date, time, "Hari Ini", lab, "Office", extra.course ?? "Praktikum", extra.prodi ?? "IF", "22-IF-01", "Peminjam", extra.notes ?? ""];
}

describe("parseAgenda", () => {
  it("drops headers, placeholders and the borrower's email", () => {
    const entries = parseAgenda([
      HEADER,
      agendaRow("1", "21 Januari 2026", "10:40-12:20", "L 7.3.2"),
      ["Loading...", "", "", "", "", "", "", ""],
      ["#REF!", "", "", "", "", "", "", ""],
      agendaRow("", "21 Januari 2026", "08:00", "L 7.3.3"),
      HEADER,
      agendaRow("2", "20 Januari 2026", "08.30 - 16.00", "L  7.4.1"),
    ]);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => [e.date, e.lab])).toEqual([
      ["2026-01-20", "L 7.4.1"],
      ["2026-01-21", "L 7.3.2"],
    ]);
    expect(JSON.stringify(entries)).not.toContain("example.test");
  });

  it("sorts by start time within a day and puts unreadable dates last", () => {
    const entries = parseAgenda([
      agendaRow("1", "besok", "08:00", "L 7.3.1"),
      agendaRow("2", "20 Januari 2026", "13:00-15:00", "L 7.3.1"),
      agendaRow("3", "20 Januari 2026", "08.30 - 16.00", "L 7.3.2"),
    ]);
    expect(entries.map((e) => e.time)).toEqual(["08.30 - 16.00", "13:00-15:00", "08:00"]);
    expect(entries[2]).toMatchObject({ date: null, dateLabel: "besok" });
  });

  it("tags maintenance activities", () => {
    const [byNotes, byProgram, booking] = parseAgenda([
      agendaRow("1", "20 Januari 2026", "08:00", "L 7.3.1", { notes: "Maintenance PC" }),
      agendaRow("2", "20 Januari 2026", "09:00", "L 7.3.1", { prodi: "Laboratorium" }),
      agendaRow("3", "20 Januari 2026", "10:00", "L 7.3.1"),
    ]);
    expect([byNotes.isMaintenance, byProgram.isMaintenance, booking.isMaintenance]).toEqual([true, true, false]);
  });

  it("knows when IMPORTRANGE is still loading", () => {
    expect(isAgendaStillLoading([HEADER, ["Loading...", "x"], ["Loading...", "y"]])).toBe(true);
    expect(isAgendaStillLoading([HEADER, ["Loading...", "x"], agendaRow("1", "20 Januari 2026", "08:00", "L 7.3.1")])).toBe(false);
    expect(isAgendaStillLoading([HEADER])).toBe(false);
  });
});
