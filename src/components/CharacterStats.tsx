import type { EquipmentItem } from "@/domain/state";

type CharacterStatsProps = {
  currentHp: number;
  maxHp: number;
  attack: number;
  bestPlus: number;
  exploreCount: number;
  restCount: number;
  equippedWeapon: EquipmentItem | null;
  equippedArmor: EquipmentItem | null;
};

export const CharacterStats = ({
  currentHp,
  maxHp,
  attack,
  bestPlus,
  exploreCount,
  restCount,
  equippedWeapon,
  equippedArmor,
}: CharacterStatsProps) => {
  return (
    <section className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold">캐릭터 스텟</h2>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          체력: {currentHp}/{maxHp}
        </div>
        <div>공격력: {attack}</div>
        <div>최고 강화: +{bestPlus}</div>
        <div>탐사 횟수: {exploreCount}</div>
        <div>휴식 횟수: {restCount}</div>
        <div>무기 장착: {equippedWeapon ? `+${equippedWeapon.plus} 검` : "없음"}</div>
        <div>갑옷 장착: {equippedArmor ? `+${equippedArmor.plus} 갑옷` : "없음"}</div>
      </div>
    </section>
  );
};

