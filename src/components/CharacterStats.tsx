import type { EquipmentItem } from "@/domain/state";

type CharacterStatsProps = {
  currentHp: number;
  maxHp: number;
  attack: number;
  exploreCount: number;
  restCount: number;
  equippedWeapon: EquipmentItem | null;
  equippedArmor: EquipmentItem | null;
};

export const CharacterStats = ({
  currentHp,
  maxHp,
  attack,
  exploreCount,
  restCount,
  equippedWeapon,
  equippedArmor,
}: CharacterStatsProps) => {
  return (
    <section className="window-panel p-3">
      <h2 className="window-title">캐릭터 상태</h2>

      <div className="kv-grid mt-3">
        <div className="kv-row">
          <span className="kv-label">HP</span>
          <span className="kv-value">{currentHp}/{maxHp}</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">ATK</span>
          <span className="kv-value">{attack}</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">WEAPON</span>
          <span className="kv-value">{equippedWeapon ? `+${equippedWeapon.plus}` : "없음"}</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">ARMOR</span>
          <span className="kv-value">{equippedArmor ? `+${equippedArmor.plus}` : "없음"}</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">EXPLORE</span>
          <span className="kv-value">{exploreCount}회</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">REST</span>
          <span className="kv-value">{restCount}회</span>
        </div>
      </div>
    </section>
  );
};
