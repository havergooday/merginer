import type { EquipmentItem, Floor } from "@/domain/state";

export const slotLabel = (item: EquipmentItem) =>
  `${item.kind === "weapon" ? "검" : "갑옷"} +${item.plus} (${item.id})`;

export const exploreFloorCards: Array<{ id: number; actualFloor: Floor; zone: string }> = [
  { id: 1, actualFloor: 1, zone: "산림" },
  { id: 2, actualFloor: 2, zone: "동굴" },
  { id: 3, actualFloor: 3, zone: "동굴" },
  { id: 4, actualFloor: 1, zone: "산림" },
  { id: 5, actualFloor: 1, zone: "산림" },
  { id: 6, actualFloor: 1, zone: "산림" },
  { id: 7, actualFloor: 1, zone: "산림" },
  { id: 8, actualFloor: 1, zone: "산림" },
  { id: 9, actualFloor: 1, zone: "산림" },
  { id: 10, actualFloor: 1, zone: "산림" },
];

export const EXPLORE_ITEMS_PER_PAGE = 3;
