import type { Floor } from "@/domain/state";
import type { ExploreSessionViewModel } from "@/hooks/useExploreProgress";

type ExploreProgressModalProps = {
  isOpen: boolean;
  currentFloor: Floor;
  maxHp: number;
  session: ExploreSessionViewModel | null;
  onConfirm: () => void;
};

const getExploreEndReasonText = (session: ExploreSessionViewModel): string => {
  if (session.result.endReason === "DEFEATED") {
    return `HP가 0이 되어 ${session.result.clearedStage}단계에서 탐험이 종료되었습니다.`;
  }
  return "1-10까지 모두 클리어하고 마을로 복귀했습니다.";
};

export const ExploreProgressModal = ({
  isOpen,
  currentFloor,
  maxHp,
  session,
  onConfirm,
}: ExploreProgressModalProps) => {
  if (!isOpen || !session) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl ring-1 ring-slate-200">
        <h2 className="text-lg font-bold">탐험 진행</h2>
        <p className="mt-2 text-sm text-slate-700">
          현재 단계: {currentFloor}-{session.popupCurrentStage > 0 ? session.popupCurrentStage : 1}
        </p>
        <p className="mt-1 text-sm text-slate-700">
          현재 체력: {session.popupCurrentHp}/{maxHp}
        </p>
        <p className="mt-1 text-sm text-slate-700">진행률: {session.visibleLogs.length}/10</p>

        <div className="mt-4 max-h-52 overflow-y-auto rounded-md bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
          {session.visibleLogs.length === 0 ? (
            <p className="text-slate-500">탐험 시작 준비 중...</p>
          ) : (
            <ul className="space-y-1">
              {session.visibleLogs.map((log) => (
                <li key={log.stage}>
                  {currentFloor}-{log.stage} 클리어 | 피해 -{log.damageTaken} | HP {log.hpAfter} | 보상 철{" "}
                  {log.reward.ironOre}
                  {log.reward.steelOre > 0 ? ` / 강 ${log.reward.steelOre}` : ""}
                  {log.reward.mithril > 0 ? ` / 미 ${log.reward.mithril}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        {session.isResultReady ? (
          <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
            <p className="font-medium">탐험 종료</p>
            <p className="mt-1">{getExploreEndReasonText(session)}</p>
            <p className="mt-1">
              총 보상: 철광석 {session.result.totalReward.ironOre}
              {session.result.totalReward.steelOre > 0
                ? `, 강철석 ${session.result.totalReward.steelOre}`
                : ""}
              {session.result.totalReward.mithril > 0
                ? `, 미스릴 ${session.result.totalReward.mithril}`
                : ""}
            </p>
            <button
              type="button"
              className="mt-3 rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
              onClick={onConfirm}
            >
              확인
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">단계별 진행을 계산 중입니다...</p>
        )}
      </div>
    </div>
  );
};
