#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const parseArgs = (argv) => {
  let input = "reports/balance/summary.csv";
  let output = "reports/balance/verdict.json";
  let baseline = "";
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (!next) continue;
    if (arg === "--input") {
      input = next;
      i += 1;
      continue;
    }
    if (arg === "--output") {
      output = next;
      i += 1;
      continue;
    }
    if (arg === "--baseline") {
      baseline = next;
      i += 1;
    }
  }
  return {
    input: path.resolve(input),
    output: path.resolve(output),
    baseline: baseline ? path.resolve(baseline) : "",
  };
};

const readCsv = async (filePath) => {
  const text = await readFile(filePath, "utf8");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return [];
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
};

const num = (row, key) => Number(row[key] ?? 0);
const bool = (row, key) => row[key] === "true";

const percentile = (values, p) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
};

const classify = (value, passCond, warnCond) => {
  if (passCond(value)) return "pass";
  if (warnCond(value)) return "warn";
  return "fail";
};
const withinRatio = (value, target, ratio) => Math.abs(value - target) <= Math.abs(target * ratio);

const avg = (values) => (values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length);
const toTopReasons = (pairs, topN = 3) =>
  pairs
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
const getReasonCount = (reasons, reasonCode) =>
  (Array.isArray(reasons) ? reasons : []).find((entry) => entry.reasonCode === reasonCode)?.count ?? 0;

const maxStatus = (statuses) => {
  if (statuses.includes("fail")) return "fail";
  if (statuses.includes("warn")) return "warn";
  return "pass";
};
const classifyEfficiency = (spent, earned) => {
  if (earned === 0 && spent === 0) {
    return { value: "N/A", status: "na" };
  }
  const ratio = earned <= 0 ? Number.POSITIVE_INFINITY : spent / earned;
  return {
    value: ratio,
    status: classify(ratio, (v) => v <= 0.95, (v) => v <= 1.05),
  };
};
const buildActivationStageGates = ({
  resourceConversionCount,
  craftSteel,
  enhance6to9Count,
  abortedByStagnationRate,
  weaponArmorRatio,
  plus6ReachRate,
}) => {
  const ratioStatus = classify(weaponArmorRatio, (v) => v >= 0.7 && v <= 1.4, (v) => v >= 0.5 && v <= 1.8);
  return {
    conversionActivation: {
      value: resourceConversionCount,
      status: resourceConversionCount > 0 ? "pass" : "fail",
      threshold: "> 0",
    },
    steelActivation: {
      value: craftSteel,
      status: craftSteel > 0 ? "pass" : "fail",
      threshold: "> 0",
    },
    midTierEntry: {
      value: enhance6to9Count,
      status: enhance6to9Count > 0 ? "pass" : "fail",
      threshold: "> 0",
    },
    stagnationControl: {
      value: abortedByStagnationRate,
      status: abortedByStagnationRate <= 0.95 ? "pass" : "fail",
      threshold: "<= 0.95",
    },
    ratioSafety: {
      value: weaponArmorRatio,
      status: ratioStatus === "pass" ? "pass" : "fail",
      threshold: "0.7 ~ 1.4",
    },
    plus6ReachSafety: {
      value: plus6ReachRate,
      status: plus6ReachRate >= 0.9 ? "pass" : "warn",
      threshold: ">= 0.9",
    },
  };
};
const getStageGateStatus = (stageGates) => {
  const required = [
    stageGates.floor3ReachRate,
    stageGates.floor3ClearRate,
    stageGates.plus8Entry,
    stageGates.ratioSafety,
    stageGates.floor3ClearTimeP50,
    stageGates.floor3ClearTimeP90,
  ];
  if (required.some((gate) => gate.status === "fail")) {
    return "fail";
  }
  if (required.some((gate) => gate.status === "warn")) {
    return "warn";
  }
  const optional = [stageGates.plus6ReachSafety];
  if (optional.some((gate) => gate.status === "warn")) {
    return "warn";
  }
  return "pass";
};

const floorTimeStats = (rows, floor) => {
  const reachedKey = `floor${floor}Reached`;
  const firstExploreKey = `floor${floor}FirstExploreLogicalTimeMs`;
  const clearKey = `floor${floor}ClearLogicalTimeMs`;
  const reachedCount = rows.filter((row) => bool(row, reachedKey)).length;
  const firstExploreTimes = rows
    .map((row) => num(row, firstExploreKey))
    .filter((value) => Number.isFinite(value) && value >= 0);
  const clearTimes = rows
    .map((row) => num(row, clearKey))
    .filter((value) => Number.isFinite(value) && value > 0);
  const clearCount = clearTimes.length;
  return {
    reachRate: rows.length > 0 ? reachedCount / rows.length : 0,
    firstExploreTimeP50: firstExploreTimes.length > 0 ? percentile(firstExploreTimes, 50) : null,
    firstExploreTimeP90: firstExploreTimes.length > 0 ? percentile(firstExploreTimes, 90) : null,
    clearRate: rows.length > 0 ? clearCount / rows.length : 0,
    clearTimeP50: clearCount > 0 ? percentile(clearTimes, 50) : null,
    clearTimeP90: clearCount > 0 ? percentile(clearTimes, 90) : null,
  };
};

const buildFloorStats = (rows) => ({
  floor1: floorTimeStats(rows, 1),
  floor2: floorTimeStats(rows, 2),
  floor3: floorTimeStats(rows, 3),
});

const buildGoal15mStageGates = ({
  floor3ReachRate,
  floor3ClearRate,
  floor3ClearTimeP50,
  floor3ClearTimeP90,
  plus6ReachRate,
  plus8ReachRate,
  plus8TimeP50,
  weaponArmorRatio,
}) => {
  const ratioStatus = classify(weaponArmorRatio, (v) => v >= 0.7 && v <= 1.4, (v) => v >= 0.5 && v <= 1.8);
  return {
    floor3ReachRate: {
      value: floor3ReachRate,
      status: classify(floor3ReachRate, (v) => v >= 0.9, (v) => v >= 0.75),
      threshold: "pass >= 0.9, warn >= 0.75",
    },
    floor3ClearRate: {
      value: floor3ClearRate,
      status: classify(floor3ClearRate, (v) => v >= 0.5, (v) => v >= 0.3),
      threshold: "pass >= 0.5, warn >= 0.3",
    },
    plus8Entry: {
      value: plus8ReachRate,
      status: classify(plus8ReachRate, (v) => v >= 0.2, (v) => v >= 0.1),
      threshold: "pass >= 0.2, warn >= 0.1",
    },
    ratioSafety: {
      value: weaponArmorRatio,
      status: ratioStatus === "pass" ? "pass" : "fail",
      threshold: "0.7 ~ 1.4",
    },
    floor3ClearTimeP50: {
      value: floor3ClearTimeP50,
      status: classify(
        Number.isFinite(floor3ClearTimeP50) ? floor3ClearTimeP50 : Number.POSITIVE_INFINITY,
        (v) => v <= 900000,
        (v) => v <= 1200000,
      ),
      threshold: "pass <= 900000ms, warn <= 1200000ms",
    },
    floor3ClearTimeP90: {
      value: floor3ClearTimeP90,
      status: classify(
        Number.isFinite(floor3ClearTimeP90) ? floor3ClearTimeP90 : Number.POSITIVE_INFINITY,
        (v) => v <= 1200000,
        (v) => v <= 1500000,
      ),
      threshold: "pass <= 1200000ms, warn <= 1500000ms",
    },
    plus6ReachSafety: {
      value: plus6ReachRate,
      status: plus6ReachRate >= 0.9 ? "pass" : "warn",
      threshold: ">= 0.9",
    },
    plus8TimeP50: {
      value: Number.isFinite(plus8TimeP50) ? plus8TimeP50 : null,
      status: classify(plus8TimeP50, (v) => v <= 1_500_000, (v) => v <= 1_800_000),
      threshold: "pass <= 1500000ms, warn <= 1800000ms",
    },
  };
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const rows = await readCsv(args.input);
  let baselineVerdict = null;
  if (rows.length === 0) {
    throw new Error("summary rows are empty");
  }
  if (args.baseline) {
    try {
      baselineVerdict = JSON.parse(await readFile(args.baseline, "utf8"));
    } catch {
      baselineVerdict = null;
    }
  }

  const clearRate = rows.filter((row) => bool(row, "completed")).length / rows.length;
  const abortedRate = rows.filter((row) => bool(row, "abortedByLoopCap")).length / rows.length;
  const playTimes = rows.map((row) => num(row, "logicalPlayTimeMs"));
  const p50 = percentile(playTimes, 50);
  const p90 = percentile(playTimes, 90);
  const craftWeapon = rows.reduce((acc, row) => acc + num(row, "craftWeaponCount"), 0);
  const craftArmor = rows.reduce((acc, row) => acc + num(row, "craftArmorCount"), 0);
  const craftSteel = rows.reduce((acc, row) => acc + num(row, "craftSteelCount"), 0);
  const craftMithril = rows.reduce((acc, row) => acc + num(row, "craftMithrilCount"), 0);
  const forgeUpgradeCount = rows.reduce((acc, row) => acc + num(row, "forgeUpgradeCount"), 0);
  const enhance6to9Count = rows.reduce((acc, row) => acc + num(row, "enhance6to9"), 0);
  const resourceConversionCount = rows.reduce((acc, row) => acc + num(row, "resourceConversionCount"), 0);
  const abortedByStagnationRate = rows.filter((row) => bool(row, "abortedByStagnation")).length / rows.length;
  const convBlockedByForgeLevel = rows.reduce((acc, row) => acc + num(row, "convBlockedByForgeLevel"), 0);
  const convBlockedByOre = rows.reduce((acc, row) => acc + num(row, "convBlockedByOre"), 0);
  const convBlockedByTargetInactive = rows.reduce((acc, row) => acc + num(row, "convBlockedByTargetInactive"), 0);
  const convBlockedByTargetMet = rows.reduce((acc, row) => acc + num(row, "convBlockedByTargetMet"), 0);
  const enhanceBlockedByPairMissing = rows.reduce((acc, row) => acc + num(row, "enhanceBlockedByPairMissing"), 0);
  const enhanceBlockedByMaterials = rows.reduce((acc, row) => acc + num(row, "enhanceBlockedByMaterials"), 0);
  const plus6ReachedRows = rows.filter((row) => bool(row, "plus6Reached"));
  const plus6ReachRate = plus6ReachedRows.length / rows.length;
  const plus6Times = plus6ReachedRows
    .map((row) => num(row, "plus6ReachedLogicalTimeMs"))
    .filter((value) => Number.isFinite(value) && value > 0);
  const plus6TimeP50 = plus6Times.length > 0 ? percentile(plus6Times, 50) : Number.POSITIVE_INFINITY;
  const plus8Times = rows
    .map((row) => num(row, "plus8ReachedLogicalTimeMs"))
    .filter((value) => Number.isFinite(value) && value > 0);
  const plus8ReachRate = plus8Times.length / rows.length;
  const plus8TimeP50 = plus8Times.length > 0 ? percentile(plus8Times, 50) : Number.POSITIVE_INFINITY;
  const floorStats = buildFloorStats(rows);
  const armorLagMaxAvg = avg(rows.map((row) => num(row, "armorLagMax")));
  const consecutiveWeaponCraftMaxAvg = avg(rows.map((row) => num(row, "consecutiveWeaponCraftMax")));
  const weaponArmorRatio = craftArmor === 0 ? Number.POSITIVE_INFINITY : craftWeapon / craftArmor;

  const successTotal = avg(rows.map((row) => num(row, "enhanceSuccessRateTotal")));
  const expectedTotal = avg(rows.map((row) => num(row, "enhanceExpectedRateTotal")));
  const success0to5 = avg(rows.map((row) => num(row, "enhanceSuccessRate0to5")));
  const expected0to5 = avg(rows.map((row) => num(row, "enhanceExpectedRate0to5")));
  const success6to9 = avg(rows.map((row) => num(row, "enhanceSuccessRate6to9")));
  const expected6to9 = avg(rows.map((row) => num(row, "enhanceExpectedRate6to9")));
  const success10plus = avg(rows.map((row) => num(row, "enhanceSuccessRate10plus")));
  const expected10plus = avg(rows.map((row) => num(row, "enhanceExpectedRate10plus")));

  const errTotal = Math.abs(successTotal - expectedTotal);
  const err0to5 = Math.abs(success0to5 - expected0to5);
  const err6to9 = Math.abs(success6to9 - expected6to9);
  const err10plus = Math.abs(success10plus - expected10plus);

  const ironEarned = rows.reduce((acc, row) => acc + num(row, "ironEarned"), 0);
  const ironSpent = rows.reduce((acc, row) => acc + num(row, "ironSpent"), 0);
  const steelEarned = rows.reduce((acc, row) => acc + num(row, "steelEarned"), 0);
  const steelSpent = rows.reduce((acc, row) => acc + num(row, "steelSpent"), 0);
  const mithrilEarned = rows.reduce((acc, row) => acc + num(row, "mithrilEarned"), 0);
  const mithrilSpent = rows.reduce((acc, row) => acc + num(row, "mithrilSpent"), 0);

  const ironEfficiency = classifyEfficiency(ironSpent, ironEarned);
  const steelEfficiency = classifyEfficiency(steelSpent, steelEarned);
  const mithrilEfficiency = classifyEfficiency(mithrilSpent, mithrilEarned);

  const checks = {
    clearRate: { value: clearRate, status: classify(clearRate, (v) => v >= 0.55, (v) => v >= 0.4) },
    abortedRate: { value: abortedRate, status: classify(abortedRate, (v) => v <= 0.01, (v) => v <= 0.03) },
    logicalPlayTimeP50: { value: p50, status: classify(p50, (v) => v <= 180000, (v) => v <= 240000) },
    logicalPlayTimeP90: { value: p90, status: classify(p90, (v) => v <= 300000, (v) => v <= 420000) },
    weaponArmorCraftRatio: {
      value: weaponArmorRatio,
      status: classify(weaponArmorRatio, (v) => v >= 0.7 && v <= 1.4, (v) => v >= 0.5 && v <= 1.8),
    },
    steelMithrilCraftAvailability: {
      value: { craftSteel, craftMithril },
      status: craftSteel === 0 || craftMithril === 0 ? "warn" : "pass",
    },
    enhanceRateDeltaTotal: { value: errTotal, status: classify(errTotal, (v) => v <= 0.05, (v) => v <= 0.1) },
    enhanceRateDelta0to5: { value: err0to5, status: classify(err0to5, (v) => v <= 0.05, (v) => v <= 0.1) },
    enhanceRateDelta6to9: { value: err6to9, status: classify(err6to9, (v) => v <= 0.05, (v) => v <= 0.1) },
    enhanceRateDelta10plus: { value: err10plus, status: classify(err10plus, (v) => v <= 0.05, (v) => v <= 0.1) },
    ironEfficiency,
    steelEfficiency,
    mithrilEfficiency,
  };
  const legacyChecks = checks;
  const directionalChecks = {
    craftBias: {
      value: {
        weaponArmorRatio,
        armorLagMaxAvg,
        consecutiveWeaponCraftMaxAvg,
      },
      status: classify(weaponArmorRatio, (v) => v >= 0.7 && v <= 1.4, (v) => v >= 0.5 && v <= 1.8),
    },
    conversionActivation: {
      value: { craftSteel, craftMithril, resourceConversionCount },
      status: resourceConversionCount > 0 ? "pass" : "fail",
    },
    midTierEntry: {
      value: enhance6to9Count,
      status: enhance6to9Count > 0 ? "pass" : "fail",
    },
    forgeProgress: {
      value: forgeUpgradeCount,
      status: forgeUpgradeCount > 0 ? "pass" : "fail",
    },
    tierResourceActivation: {
      value: resourceConversionCount,
      status: resourceConversionCount > 0 ? "pass" : "fail",
    },
    stagnationAbortRate: {
      value: abortedByStagnationRate,
      status: classify(abortedByStagnationRate, (v) => v <= 0.2, (v) => v <= 0.5),
    },
  };
  const boundaryProximity = {
    clearRateNearPassWarnBoundary: withinRatio(clearRate, 0.55, 0.05),
    logicalPlayTimeP90NearWarnFailBoundary: withinRatio(p90, 420000, 0.1),
    weaponArmorRatioDirectionalOnly:
      checks.weaponArmorCraftRatio.status !== "pass" || !Number.isFinite(weaponArmorRatio),
  };
  const secondaryCollectionTrigger = {
    shouldRun: boundaryProximity.clearRateNearPassWarnBoundary || (abortedRate >= 0.01 && abortedRate <= 0.03) || boundaryProximity.logicalPlayTimeP90NearWarnFailBoundary,
    reasons: [
      ...(boundaryProximity.clearRateNearPassWarnBoundary ? ["clearRate_near_pass_warn_boundary"] : []),
      ...(abortedRate >= 0.01 && abortedRate <= 0.03 ? ["abortedRate_in_warn_band"] : []),
      ...(boundaryProximity.logicalPlayTimeP90NearWarnFailBoundary ? ["p90_near_warn_fail_boundary"] : []),
    ],
    suggestedAdditionalSessionsPerPolicy: 25,
    suggestedAdditionalTotalSessions: 75,
  };
  const decisionDiagnostics = {
    conversionTopReasons: toTopReasons([
      { reasonCode: "CONV_BLOCK_ORE_SHORTAGE", count: convBlockedByOre },
      { reasonCode: "CONV_BLOCK_FORGE_LEVEL", count: convBlockedByForgeLevel },
      { reasonCode: "CONV_BLOCK_TARGET_NOT_ACTIVE", count: convBlockedByTargetInactive },
      { reasonCode: "CONV_BLOCK_TARGET_ALREADY_MET", count: convBlockedByTargetMet },
    ]),
    midTierTopReasons: toTopReasons([
      { reasonCode: "ENHANCE_BLOCK_PAIR_NOT_FOUND", count: enhanceBlockedByPairMissing },
      { reasonCode: "ENHANCE_BLOCK_MATERIAL_SHORTAGE", count: enhanceBlockedByMaterials },
      { reasonCode: "CONV_BLOCK_ORE_SHORTAGE", count: convBlockedByOre },
      { reasonCode: "CONV_BLOCK_FORGE_LEVEL", count: convBlockedByForgeLevel },
    ]),
  };
  const conversionTotalBlockedCount =
    convBlockedByOre + convBlockedByForgeLevel + convBlockedByTargetInactive + convBlockedByTargetMet;
  const dominantConversionEntry = decisionDiagnostics.conversionTopReasons[0] ?? null;
  decisionDiagnostics.conversionBlockedDominantReason = dominantConversionEntry;
  decisionDiagnostics.conversionBlockShare =
    dominantConversionEntry && conversionTotalBlockedCount > 0
      ? dominantConversionEntry.count / conversionTotalBlockedCount
      : null;
  const clearRateTopReasons = toTopReasons([
    { reasonCode: "ENHANCE_BLOCK_PAIR_NOT_FOUND", count: enhanceBlockedByPairMissing },
    { reasonCode: "ENHANCE_BLOCK_MATERIAL_SHORTAGE", count: enhanceBlockedByMaterials },
    { reasonCode: "CONV_BLOCK_TARGET_ALREADY_MET", count: convBlockedByTargetMet },
    { reasonCode: "CONV_BLOCK_ORE_SHORTAGE", count: convBlockedByOre },
    { reasonCode: "CONV_BLOCK_TARGET_NOT_ACTIVE", count: convBlockedByTargetInactive },
    { reasonCode: "CONV_BLOCK_FORGE_LEVEL", count: convBlockedByForgeLevel },
  ]);
  const baselinePairMissing = getReasonCount(
    baselineVerdict?.decisionDiagnostics?.midTierTopReasons,
    "ENHANCE_BLOCK_PAIR_NOT_FOUND",
  );
  const baselineStagnationRate = Number(
    baselineVerdict?.directionalChecks?.stagnationAbortRate?.value ?? Number.NaN,
  );
  const pairMissingDropRate =
    baselinePairMissing > 0
      ? (baselinePairMissing - enhanceBlockedByPairMissing) / baselinePairMissing
      : null;
  const stagnationDrop =
    Number.isFinite(baselineStagnationRate)
      ? baselineStagnationRate - abortedByStagnationRate
      : null;
  const contentCycleChecks = {
    midTierEntry: {
      value: enhance6to9Count,
      status: enhance6to9Count > 0 ? "pass" : "fail",
    },
    plus6TimeP50: {
      value: Number.isFinite(plus6TimeP50) ? plus6TimeP50 : null,
      status: classify(plus6TimeP50, (v) => v <= 900000, (v) => v <= 960000),
    },
    plus6ReachRate: {
      value: plus6ReachRate,
      status: classify(plus6ReachRate, (v) => v >= 0.6, (v) => v >= 0.4),
    },
    plus8ReachRate: {
      value: plus8ReachRate,
      status: classify(plus8ReachRate, (v) => v >= 0.2, (v) => v >= 0.1),
    },
    plus8TimeP50: {
      value: Number.isFinite(plus8TimeP50) ? plus8TimeP50 : null,
      status: classify(plus8TimeP50, (v) => v <= 1_500_000, (v) => v <= 1_800_000),
    },
    pairMissingDrop: {
      value: pairMissingDropRate,
      status:
        pairMissingDropRate === null
          ? "unknown"
          : pairMissingDropRate >= 0.3
            ? "pass"
            : "fail",
    },
    stagnationAbortTrend: {
      value: stagnationDrop,
      status:
        stagnationDrop === null
          ? "unknown"
          : stagnationDrop > 0
            ? "pass"
            : "fail",
    },
    weaponArmorCraftRatio: {
      value: weaponArmorRatio,
      status: checks.weaponArmorCraftRatio.status,
    },
    conversionActivation: {
      value: resourceConversionCount,
      status: directionalChecks.conversionActivation.status,
      mode: "diagnostic_only",
    },
    clearRateTrend: {
      value: clearRate,
      mode: "trend_only",
    },
  };
  const contentCycleStatus = (() => {
    const statuses = Object.values(contentCycleChecks)
      .map((check) => check.status)
      .filter((status) => typeof status === "string");
    if (statuses.includes("fail")) return "fail";
    if (statuses.includes("unknown")) return "warn";
    return "pass";
  })();
  const gateProfile = "goal_15m_v1";
  const stageGates = buildGoal15mStageGates({
    floor3ReachRate: floorStats.floor3.reachRate,
    floor3ClearRate: floorStats.floor3.clearRate,
    floor3ClearTimeP50: floorStats.floor3.clearTimeP50,
    floor3ClearTimeP90: floorStats.floor3.clearTimeP90,
    plus6ReachRate,
    plus8ReachRate,
    plus8TimeP50,
    weaponArmorRatio,
  });
  const overallStatus = getStageGateStatus(stageGates);

  const policyNames = [...new Set(rows.map((row) => row.policy).filter(Boolean))].sort();
  const policyBreakdown = Object.fromEntries(
    policyNames.map((policy) => {
      const policyRows = rows.filter((row) => row.policy === policy);
      const policyFloorStats = buildFloorStats(policyRows);
      const policyCraftWeapon = policyRows.reduce((acc, row) => acc + num(row, "craftWeaponCount"), 0);
      const policyCraftArmor = policyRows.reduce((acc, row) => acc + num(row, "craftArmorCount"), 0);
      const policyEnhance6to9 = policyRows.reduce((acc, row) => acc + num(row, "enhance6to9"), 0);
      const policyConversions = policyRows.reduce((acc, row) => acc + num(row, "resourceConversionCount"), 0);
      const policyPairMissing = policyRows.reduce((acc, row) => acc + num(row, "enhanceBlockedByPairMissing"), 0);
      const policyMaterialShortage = policyRows.reduce((acc, row) => acc + num(row, "enhanceBlockedByMaterials"), 0);
      const policyConvTargetMet = policyRows.reduce((acc, row) => acc + num(row, "convBlockedByTargetMet"), 0);
      const policyConvOre = policyRows.reduce((acc, row) => acc + num(row, "convBlockedByOre"), 0);
      const policyConvTargetInactive = policyRows.reduce((acc, row) => acc + num(row, "convBlockedByTargetInactive"), 0);
      const policyReasons = toTopReasons([
        { reasonCode: "ENHANCE_BLOCK_PAIR_NOT_FOUND", count: policyPairMissing },
        { reasonCode: "ENHANCE_BLOCK_MATERIAL_SHORTAGE", count: policyMaterialShortage },
        { reasonCode: "CONV_BLOCK_TARGET_ALREADY_MET", count: policyConvTargetMet },
        { reasonCode: "CONV_BLOCK_ORE_SHORTAGE", count: policyConvOre },
        { reasonCode: "CONV_BLOCK_TARGET_NOT_ACTIVE", count: policyConvTargetInactive },
      ]);
      return [
        policy,
        {
          sessionCount: policyRows.length,
          floorStats: policyFloorStats,
          weaponArmorRatio:
            policyCraftArmor === 0 ? Number.POSITIVE_INFINITY : policyCraftWeapon / policyCraftArmor,
          enhance6to9: policyEnhance6to9,
          plus8ReachRate:
            policyRows.filter((row) => Number.isFinite(num(row, "plus8ReachedLogicalTimeMs")) && num(row, "plus8ReachedLogicalTimeMs") > 0).length /
            policyRows.length,
          plus8TimeP50: (() => {
            const policyPlus8Times = policyRows
              .map((row) => num(row, "plus8ReachedLogicalTimeMs"))
              .filter((value) => Number.isFinite(value) && value > 0);
            return policyPlus8Times.length > 0 ? percentile(policyPlus8Times, 50) : null;
          })(),
          resourceConversionCount: policyConversions,
          pairMissingCount: policyPairMissing,
          materialShortageCount: policyMaterialShortage,
          clearRateTopReasons: policyReasons,
        },
      ];
    }),
  );

  const verdict = {
    generatedAt: new Date().toISOString(),
    input: args.input,
    rows: rows.length,
    sampleMode: rows.length <= 150 ? "phase1_lightweight" : "full",
    interpretation: rows.length <= 150 ? "directional" : "final",
    gateProfile,
    stageGates,
    overallStatus,
    floorStats,
    clearRateTopReasons,
    policyBreakdown,
    contentCycleStatus,
    contentCycleChecks,
    legacyChecks,
    checks,
    directionalChecks,
    decisionDiagnostics,
    baselineComparison: {
      baselineInput: args.baseline || null,
      baselineLoaded: Boolean(baselineVerdict),
      baselinePairMissing,
      baselineStagnationRate: Number.isFinite(baselineStagnationRate) ? baselineStagnationRate : null,
    },
    boundaryProximity,
    secondaryCollectionTrigger,
  };

  await writeFile(args.output, JSON.stringify(verdict, null, 2), "utf8");
  console.log(`[balance:verdict] ${overallStatus} -> ${args.output}`);
};

main().catch((error) => {
  console.error("[balance:verdict] failed", error);
  process.exit(1);
});

