import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { areas, rooms } from "@/lib/db/schema";
import { roomKey } from "@/lib/sheets/cells";
import type { RoomDirectory } from "./group";

/** Every known room, keyed by roomKey(code), with its staffing area. */
export const getRoomDirectory = cache(async (): Promise<RoomDirectory> => {
  const rows = await db
    .select({
      code: rooms.code,
      building: rooms.building,
      floor: rooms.floor,
      kind: rooms.kind,
      visible: rooms.visible,
      area: areas,
    })
    .from(rooms)
    .leftJoin(areas, eq(rooms.areaId, areas.id));
  return new Map(rows.map((row) => [roomKey(row.code), row]));
});
