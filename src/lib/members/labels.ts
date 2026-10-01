export type Pool = "lab" | "studio" | "pkl";

export const POOL_LABEL: Record<Pool, string> = {
  lab: "Lab (Gedung 2 & 7)",
  studio: "Studio",
  pkl: "PKL",
};

export const POOL_SHORT_LABEL: Record<Pool, string> = {
  lab: "Lab",
  studio: "Studio",
  pkl: "PKL",
};
