// Configuration every install starts with. Admins can change it later in the
// app; `pnpm db:seed` only adds rows that are missing.

type Building = "G2" | "G7";

export type AreaSeed = {
  code: string;
  name: string;
  building: Building;
  kind: "floor" | "studio" | "building";
  sortOrder: number;
};

export type RoomSeed = {
  code: string;
  building: Building | null;
  floor: number | null;
  kind: "lab" | "studio" | "virtual";
  area: string | null;
  visible: boolean;
};

export type ShiftSeed = {
  code: string;
  mode: "lecture" | "maintenance";
  label: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
};

export type SeatSeed = { area: string; shift: string; capacity: number };

/** Full names start as the nickname; admins can fill them in on the members page. */
export type MemberSeed =
  | { nickname: string; role: "admin"; email: string }
  | { nickname: string; role: "staff"; pool: "lab" | "studio" | "pkl" };

export const AREAS: AreaSeed[] = [
  { code: "studio-g2", name: "Studio G2", building: "G2", kind: "studio", sortOrder: 10 },
  { code: "g2-l23", name: "G2 Lantai 2 & 3", building: "G2", kind: "floor", sortOrder: 20 },
  { code: "g2-l4", name: "G2 Lantai 4", building: "G2", kind: "floor", sortOrder: 30 },
  { code: "g7-l3", name: "G7 Lantai 3", building: "G7", kind: "floor", sortOrder: 40 },
  { code: "g7-l4", name: "G7 Lantai 4", building: "G7", kind: "floor", sortOrder: 50 },
  { code: "g7-l5", name: "G7 Lantai 5", building: "G7", kind: "floor", sortOrder: 60 },
  { code: "g7-l6", name: "G7 Lantai 6", building: "G7", kind: "floor", sortOrder: 70 },
  { code: "g2", name: "Gedung 2", building: "G2", kind: "building", sortOrder: 80 },
  { code: "g7", name: "Gedung 7", building: "G7", kind: "building", sortOrder: 90 },
];

function labs(building: Building, floor: number, area: string, count: number): RoomSeed[] {
  const prefix = building === "G2" ? 2 : 7;
  return Array.from({ length: count }, (_, i) => ({
    code: `L ${prefix}.${floor}.${i + 1}`,
    building,
    floor,
    kind: "lab" as const,
    area,
    visible: true,
  }));
}

function hidden(code: string, building: Building | null, floor: number | null, kind: RoomSeed["kind"]): RoomSeed {
  return { code, building, floor, kind, area: null, visible: false };
}

export const ROOMS: RoomSeed[] = [
  { code: "S 2.2.8", building: "G2", floor: 2, kind: "studio", area: "studio-g2", visible: true },
  { code: "S 2.3.1", building: "G2", floor: 3, kind: "studio", area: "studio-g2", visible: true },
  { code: "S 2.3.2", building: "G2", floor: 3, kind: "studio", area: "studio-g2", visible: true },
  { code: "L 2.2.1", building: "G2", floor: 2, kind: "lab", area: "g2-l23", visible: true },
  { code: "L 2.3.3", building: "G2", floor: 3, kind: "lab", area: "g2-l23", visible: true },
  ...labs("G2", 4, "g2-l4", 5),
  ...labs("G7", 3, "g7-l3", 3),
  ...labs("G7", 4, "g7-l4", 3),
  ...labs("G7", 5, "g7-l5", 3),
  ...labs("G7", 6, "g7-l6", 2),
  { code: "S 7.6.3", building: "G7", floor: 6, kind: "studio", area: "g7-l6", visible: true },
  // Named like a building-6 room, but staffed as part of area g7-l6.
  { code: "L 6.2.1", building: "G7", floor: 6, kind: "lab", area: "g7-l6", visible: true },
  hidden("VL.01", null, null, "virtual"),
  hidden("VL.02", null, null, "virtual"),
  hidden("VL.03", null, null, "virtual"),
  hidden("S 2.0.1", "G2", 0, "studio"),
  hidden("S 4.4.1", null, 4, "studio"),
  hidden("S 4.4.2", null, 4, "studio"),
];

export const SHIFTS: ShiftSeed[] = [
  { code: "morning", mode: "lecture", label: "Pagi", startTime: "06:30", endTime: "14:30", sortOrder: 10 },
  { code: "afternoon", mode: "lecture", label: "Siang", startTime: "09:30", endTime: "17:30", sortOrder: 20 },
  { code: "daily", mode: "maintenance", label: "Harian", startTime: "08:00", endTime: "16:00", sortOrder: 30 },
];

const FLOOR_AREAS = AREAS.filter((area) => area.kind === "floor").map((area) => area.code);

export const SEATS: SeatSeed[] = [
  // Lecture, lab and studio staff: 16 seats per day.
  { area: "studio-g2", shift: "morning", capacity: 2 },
  { area: "studio-g2", shift: "afternoon", capacity: 2 },
  ...FLOOR_AREAS.flatMap((area) => [
    { area, shift: "morning", capacity: 1 },
    { area, shift: "afternoon", capacity: 1 },
  ]),
  // Lecture, PKL pair: covers one whole building per day.
  { area: "g2", shift: "morning", capacity: 2 },
  { area: "g2", shift: "afternoon", capacity: 2 },
  { area: "g7", shift: "morning", capacity: 2 },
  { area: "g7", shift: "afternoon", capacity: 2 },
  // Maintenance: whole buildings.
  { area: "studio-g2", shift: "daily", capacity: 4 },
  { area: "g2", shift: "daily", capacity: 14 },
  { area: "g7", shift: "daily", capacity: 14 },
];

export const SETTINGS: Record<string, unknown> = {
  max_g2_per_week_default: 2,
};

// The team when the app went live. Added once per install (see seedMembers);
// after that the members page is the source of truth. PINs are set there too.
const ADMINS = [
  { nickname: "Ravenusa", email: "ravenusaarjuna@students.amikom.ac.id" },
  { nickname: "Nanda", email: "fathimahananda@students.amikom.ac.id" },
  { nickname: "Dian", email: "dianhasta@students.amikom.ac.id" },
  { nickname: "Padaka", email: "padaka19@students.amikom.ac.id" },
];
const STAFF = {
  studio: ["Bahar", "Gakkoi", "Labib", "Yazid"],
  // Rifat and Rafif are PKL students but cover lab floors like regular lab staff.
  lab: ["Nusa", "Thoriq", "Galang", "Uus", "Agung", "Latif", "Ahmad", "Nando", "Suryo", "Evan", "Rifat", "Rafif"],
} as const;

export const MEMBERS: MemberSeed[] = [
  ...ADMINS.map((admin) => ({ ...admin, role: "admin" as const })),
  ...(Object.entries(STAFF) as [keyof typeof STAFF, readonly string[]][]).flatMap(([pool, names]) =>
    names.map((nickname) => ({ nickname, role: "staff" as const, pool })),
  ),
];

/** One seat across the week: who sits in it Monday to Friday. */
export type RosterRowSeed = {
  area: string;
  shift: string;
  position?: number;
  days: readonly [string, string, string, string, string];
};

// The first published roster, copied from the team's spreadsheet for the week
// the app went live. Added once per install (see seedFirstRoster) and never
// over an existing week; later weeks come from the generator or the editor.
export const FIRST_ROSTER = {
  weekStart: "2026-09-28",
  rows: [
    { area: "g7-l5", shift: "morning", days: ["Suryo", "Ahmad", "Galang", "Nusa", "Latif"] },
    { area: "g7-l4", shift: "morning", days: ["Nusa", "Evan", "Latif", "Rifat", "Suryo"] },
    { area: "g7-l6", shift: "morning", days: ["Latif", "Agung", "Suryo", "Ahmad", "Galang"] },
    { area: "g7-l3", shift: "morning", days: ["Ahmad", "Uus", "Evan", "Rafif", "Thoriq"] },
    { area: "g7-l3", shift: "afternoon", days: ["Uus", "Rafif", "Rifat", "Uus", "Agung"] },
    { area: "g7-l4", shift: "afternoon", days: ["Evan", "Rifat", "Rafif", "Nando", "Evan"] },
    { area: "g7-l5", shift: "afternoon", days: ["Rifat", "Nusa", "Agung", "Evan", "Rifat"] },
    { area: "g7-l6", shift: "afternoon", days: ["Rafif", "Thoriq", "Nando", "Galang", "Rafif"] },
    { area: "g2-l23", shift: "morning", days: ["Thoriq", "Galang", "Ahmad", "Agung", "Uus"] },
    { area: "g2-l4", shift: "morning", days: ["Galang", "Latif", "Thoriq", "Latif", "Ahmad"] },
    { area: "g2-l23", shift: "afternoon", days: ["Nando", "Suryo", "Nusa", "Suryo", "Nando"] },
    { area: "g2-l4", shift: "afternoon", days: ["Agung", "Nando", "Uus", "Thoriq", "Nusa"] },
    { area: "studio-g2", shift: "morning", position: 1, days: ["Labib", "Yazid", "Bahar", "Yazid", "Gakkoi"] },
    { area: "studio-g2", shift: "morning", position: 2, days: ["Gakkoi", "Gakkoi", "Gakkoi", "Gakkoi", "Labib"] },
    { area: "studio-g2", shift: "afternoon", position: 1, days: ["Bahar", "Bahar", "Labib", "Bahar", "Bahar"] },
    { area: "studio-g2", shift: "afternoon", position: 2, days: ["Yazid", "Labib", "Yazid", "Labib", "Yazid"] },
  ] satisfies RosterRowSeed[],
};
