import { roomKey } from "@/lib/sheets/cells";

export type AreaInfo = {
  id: number;
  code: string;
  name: string;
  building: "G2" | "G7";
  kind: "floor" | "studio" | "building";
  sortOrder: number;
};

export type RoomInfo = {
  code: string;
  building: "G2" | "G7" | null;
  floor: number | null;
  kind: "lab" | "studio" | "virtual";
  visible: boolean;
  area: AreaInfo | null;
};

/** Rooms by roomKey(code). */
export type RoomDirectory = Map<string, RoomInfo>;

export type AreaGroup<T> = {
  /** null for rooms the directory does not know ("Lainnya"). */
  area: AreaInfo | null;
  items: T[];
};

/** Stable key for a group, for React keys and element ids; "other" for unknown rooms. */
export function areaKey(group: Pick<AreaGroup<unknown>, "area">): string {
  return group.area?.code ?? "other";
}

/** "L 7.3.2" → "7.3.2", so labs and studios on the same floor sort together. */
function roomNumber(code: string): string {
  const space = code.indexOf(" ");
  return space === -1 ? code : code.slice(space + 1);
}

/**
 * Groups anything that names a room into staffing areas, in area order. Hidden
 * rooms are left out; rooms the directory does not know go last, under null.
 * Items are sorted by room number unless `keepOrder` (e.g. agenda by time).
 */
export function groupByArea<T>(
  items: readonly T[],
  codeOf: (item: T) => string,
  directory: RoomDirectory,
  { keepOrder = false }: { keepOrder?: boolean } = {},
): AreaGroup<T>[] {
  const groups = new Map<string, AreaGroup<T>>();

  for (const item of items) {
    const room = directory.get(roomKey(codeOf(item)));
    if (room && !room.visible) continue;
    const area = room?.area ?? null;
    const key = area?.code ?? "";
    let group = groups.get(key);
    if (!group) {
      group = { area, items: [] };
      groups.set(key, group);
    }
    group.items.push(item);
  }

  if (!keepOrder) {
    for (const group of groups.values()) {
      group.items.sort((a, b) => roomNumber(codeOf(a)).localeCompare(roomNumber(codeOf(b)), "en", { numeric: true }));
    }
  }

  return [...groups.values()].sort((a, b) => (a.area?.sortOrder ?? Infinity) - (b.area?.sortOrder ?? Infinity));
}

/**
 * roomKeys of the visible rooms an area covers. A building area ("Gedung 2")
 * covers that building's floor areas; the studio has its own staff.
 */
export function roomKeysForArea(area: AreaInfo, directory: RoomDirectory): Set<string> {
  const keys = new Set<string>();
  for (const [key, room] of directory) {
    if (!room.visible || !room.area) continue;
    const inArea =
      area.kind === "building"
        ? room.area.building === area.building && room.area.kind === "floor"
        : room.area.id === area.id;
    if (inArea) keys.add(key);
  }
  return keys;
}
