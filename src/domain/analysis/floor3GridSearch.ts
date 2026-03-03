import {
  analyzeFloor3ClearSession,
  STRATEGY_PRESETS,
  type FloorProgressionPolicy,
  type SessionMetrics,
} from "@/domain/analysis/floor3ClearAnalysis";

export type StrategyReport = SessionMetrics & {
  name: string;
  policy: FloorProgressionPolicy;
};

type GridSearchOptions = {
  policies: FloorProgressionPolicy[];
  maxLoops?: number;
};

type DefaultPolicyOptions = {
  balancedDelta?: 1 | 2;
};

const clampAtLeastOne = (value: number): number => Math.max(1, value);

const sortReports = (a: StrategyReport, b: StrategyReport): number => {
  if (a.completed !== b.completed) {
    return a.completed ? -1 : 1;
  }
  if (a.exploreCount !== b.exploreCount) {
    return a.exploreCount - b.exploreCount;
  }
  return a.restCount - b.restCount;
};

export const createDefaultFloor3GridPolicies = ({ balancedDelta = 1 }: DefaultPolicyOptions = {}): FloorProgressionPolicy[] => {
  const policies: FloorProgressionPolicy[] = [
    STRATEGY_PRESETS.conservative,
    STRATEGY_PRESETS.balanced,
    STRATEGY_PRESETS.aggressive,
  ];

  const deltas = Array.from({ length: balancedDelta * 2 + 1 }, (_, index) => index - balancedDelta);
  const base = STRATEGY_PRESETS.balanced;

  for (const dAtk2 of deltas) {
    for (const dHp2 of deltas) {
      for (const dAtk3 of deltas) {
        for (const dHp3 of deltas) {
          if (dAtk2 === 0 && dHp2 === 0 && dAtk3 === 0 && dHp3 === 0) {
            continue;
          }

          const floor2Attack = clampAtLeastOne(base.floor2.attack + dAtk2);
          const floor2MaxHp = clampAtLeastOne(base.floor2.maxHp + dHp2);
          const floor3Attack = clampAtLeastOne(base.floor3.attack + dAtk3);
          const floor3MaxHp = clampAtLeastOne(base.floor3.maxHp + dHp3);

          if (floor3Attack < floor2Attack || floor3MaxHp < floor2MaxHp) {
            continue;
          }

          policies.push({
            name: `balanced[a2${dAtk2 >= 0 ? "+" : ""}${dAtk2},h2${dHp2 >= 0 ? "+" : ""}${dHp2},a3${
              dAtk3 >= 0 ? "+" : ""
            }${dAtk3},h3${dHp3 >= 0 ? "+" : ""}${dHp3}]`,
            floor2: { attack: floor2Attack, maxHp: floor2MaxHp },
            floor3: { attack: floor3Attack, maxHp: floor3MaxHp },
          });
        }
      }
    }
  }

  return policies;
};

export const runFloor3GridSearch = ({ policies, maxLoops }: GridSearchOptions): StrategyReport[] => {
  const reports: StrategyReport[] = policies.map((policy) => {
    const metrics = analyzeFloor3ClearSession({ policy, maxLoops });
    return {
      ...metrics,
      name: policy.name,
      policy,
    };
  });

  return reports.sort(sortReports);
};
