import { GoalRow, ParlayLeg, CrownParlayCover, SingleCoverRow, RebateConfig } from '../types';

export interface GoalCalcSummary {
  totalJcStake: number;
  totalHgStake: number;
  totalStake: number;
  totalJcRebate: number;
  totalHgRebate: number;
  rebateTotal: number;
  payoutPerOutcome: {
    label: string;
    description: string;
    payout: number;
    netProfit: number;
  }[];
  minPayout: number;
  expectedProfit: number;
  roiRate: number;
}

/**
 * Evaluates EXACT live settlement preview from current rows without altering any stakes.
 * Used whenever user manually adjusts any stake, odds, or individual rebate rate.
 */
export function evaluateGoalCountCurrentStakes(
  rows: GoalRow[],
  rebateConfig: RebateConfig
): GoalCalcSummary {
  const jcRows = rows.filter((r) => r.source === 'jc');
  const hgRow = rows.find((r) => r.source === 'hg');

  const totalJcStake = Number(
    jcRows.reduce((sum, r) => sum + (Number(r.stake) || 0), 0).toFixed(2)
  );
  const totalHgStake = Number(
    (hgRow ? Number(hgRow.stake) || 0 : 0).toFixed(2)
  );
  const totalStake = Number((totalJcStake + totalHgStake).toFixed(2));

  // Individual rebate calculation
  const totalJcRebate = Number(
    jcRows
      .reduce((sum, r) => sum + ((Number(r.stake) || 0) * (Number(r.rebateRate) || 0)) / 100, 0)
      .toFixed(2)
  );
  const totalHgRebate = Number(
    (hgRow
      ? ((Number(hgRow.stake) || 0) * (Number(hgRow.rebateRate) || 0)) / 100
      : 0
    ).toFixed(2)
  );
  const rebateTotal = Number((totalJcRebate + totalHgRebate).toFixed(2));

  // Determine Crown line (e.g. 大2.00, 大2.25, 大2.50, 大3.00)
  const hgLineNum = parseFloat(
    (hgRow?.crownLine || '2.00').replace(/[^\d.]/g, '')
  ) || 2.0;
  const isWholeLine = Number.isInteger(hgLineNum);

  const payoutPerOutcome: {
    label: string;
    description: string;
    payout: number;
    netProfit: number;
  }[] = [];

  // Outcome for each JC row
  jcRows.forEach((jr) => {
    const g = parseInt(jr.goalsLabel, 10);
    const stake = Number(jr.stake) || 0;
    const odds = Number(jr.odds) || 0;
    let grossPayout = stake * odds;
    let desc = `竞彩 ${jr.goalsLabel}球 命中 (赔率 ${odds.toFixed(2)})`;

    // Push handling: If line is integer (e.g. 2.00 or 3.00) and score matches
    if (isWholeLine && g === hgLineNum && hgRow) {
      grossPayout += totalHgStake; // Crown Asian handicap refunds stake
      desc = `竞彩 ${jr.goalsLabel}球 命中 + 皇冠大${hgLineNum.toFixed(2)} 走水全额退本`;
    }

    const net = grossPayout + rebateTotal - totalStake;
    payoutPerOutcome.push({
      label: `${jr.goalsLabel}球`,
      description: desc,
      payout: Number(grossPayout.toFixed(2)),
      netProfit: Number(net.toFixed(2)),
    });
  });

  // Crown Over Outcome (e.g. > line)
  if (hgRow) {
    const hgStake = Number(hgRow.stake) || 0;
    const hgOdds = Number(hgRow.odds) || 0;
    const overPayout = hgStake * hgOdds;
    const overNet = overPayout + rebateTotal - totalStake;
    const minOverGoals = isWholeLine ? hgLineNum + 1 : Math.ceil(hgLineNum);
    payoutPerOutcome.push({
      label: `${minOverGoals}+球 (皇冠大)`,
      description: `皇冠 ${hgRow.crownLine || '大球'} 命中 (赔率 ${hgOdds.toFixed(2)})`,
      payout: Number(overPayout.toFixed(2)),
      netProfit: Number(overNet.toFixed(2)),
    });
  }

  const payouts = payoutPerOutcome.map((p) => p.payout);
  const netProfits = payoutPerOutcome.map((p) => p.netProfit);

  const minPayout = payouts.length > 0 ? Math.min(...payouts) : 0;
  const expectedProfit = netProfits.length > 0 ? Math.min(...netProfits) : 0;

  const baseForRoi =
    rebateConfig.roiBase === 'jc' ? totalJcStake : totalStake;
  const roiRate =
    baseForRoi > 0 ? Number(((expectedProfit / baseForRoi) * 100).toFixed(2)) : 0;

  return {
    totalJcStake,
    totalHgStake,
    totalStake,
    totalJcRebate,
    totalHgRebate,
    rebateTotal,
    payoutPerOutcome,
    minPayout,
    expectedProfit,
    roiRate,
  };
}

/**
 * Solves optimal hedging stakes across all current goal selections based on a target JC stake.
 */
export function solveOptimalGoalCountStakes(
  rows: GoalRow[],
  targetJcTotal: number
): GoalRow[] {
  const jcRows = rows.filter((r) => r.source === 'jc');
  const hgRow = rows.find((r) => r.source === 'hg');

  if (jcRows.length === 0 || !hgRow || hgRow.odds <= 1) {
    return rows;
  }

  const hgLineNum = parseFloat(
    (hgRow.crownLine || '2.00').replace(/[^\d.]/g, '')
  ) || 2.0;
  const isWholeLine = Number.isInteger(hgLineNum);

  let jcCoeffSum = 0;
  const rowWeights: { [id: string]: number } = {};

  jcRows.forEach((row) => {
    const goalsVal = parseInt(row.goalsLabel, 10);
    const hasPushWithHg = isWholeLine && goalsVal === hgLineNum;

    if (hasPushWithHg) {
      const weight = Math.max(0, (1 - 1 / hgRow.odds) / row.odds);
      rowWeights[row.id] = weight;
      jcCoeffSum += weight;
    } else {
      const weight = 1 / row.odds;
      rowWeights[row.id] = weight;
      jcCoeffSum += weight;
    }
  });

  if (jcCoeffSum <= 0) return rows;

  const targetPayout = targetJcTotal / jcCoeffSum;

  return rows.map((r) => {
    if (r.source === 'jc') {
      const weight = rowWeights[r.id] || 0;
      const stake = Number((targetPayout * weight).toFixed(2));
      return { ...r, stake };
    } else {
      const stake = Number((targetPayout / r.odds).toFixed(2));
      return { ...r, stake };
    }
  });
}

export interface ParlayCalcSummary {
  totalJcStake: number;
  totalHgStake: number;
  totalStake: number;
  totalJcRebate: number;
  totalHgRebate: number;
  rebateTotal: number;
  outcomeReturns: {
    outcome: string;
    description: string;
    returnAmount: number;
    netProfit: number;
  }[];
  expectedProfit: number;
  roiRate: number;
}

/**
 * Evaluates live settlement preview for Parlay full cover arbitrage from current inputs.
 * Dynamically handles any arbitrary number of JC legs and Crown cover options!
 */
export function evaluateParlayCurrentStakes(
  legs: ParlayLeg[],
  hgCovers: CrownParlayCover[],
  rebateConfig: RebateConfig
): ParlayCalcSummary {
  const totalJcStake = Number(
    legs.reduce((sum, l) => sum + (Number(l.stake) || 0), 0).toFixed(2)
  );
  const totalHgStake = Number(
    hgCovers.reduce((sum, c) => sum + (Number(c.stake) || 0), 0).toFixed(2)
  );
  const totalStake = Number((totalJcStake + totalHgStake).toFixed(2));

  // Individual rebates
  const totalJcRebate = Number(
    legs
      .reduce((sum, l) => sum + ((Number(l.stake) || 0) * (Number(l.rebateRate) || 0)) / 100, 0)
      .toFixed(2)
  );
  const totalHgRebate = Number(
    hgCovers
      .reduce((sum, c) => sum + ((Number(c.stake) || 0) * (Number(c.rebateRate) || 0)) / 100, 0)
      .toFixed(2)
  );
  const rebateTotal = Number((totalJcRebate + totalHgRebate).toFixed(2));

  const outcomeReturns: {
    outcome: string;
    description: string;
    returnAmount: number;
    netProfit: number;
  }[] = [];

  // 1. For each JC leg, when it hits:
  legs.forEach((leg) => {
    const ret = (Number(leg.stake) || 0) * (Number(leg.multiplier) || 1);
    const net = ret + rebateTotal - totalStake;
    outcomeReturns.push({
      outcome: `${leg.name} 命中 (${leg.match1Pick}+${leg.match2Pick})`,
      description: `${leg.name} (${leg.multiplier.toFixed(2)}倍) 派奖 ¥${ret.toFixed(2)}`,
      returnAmount: Number(ret.toFixed(2)),
      netProfit: Number(net.toFixed(2)),
    });
  });

  // 2. For each Crown cover item:
  const hgHandicap = hgCovers.find((c) => c.playType === '让球');
  const hgDraw = hgCovers.find((c) => c.playType === '胜平负' && c.pick === '平');

  hgCovers.forEach((cover) => {
    const cStake = Number(cover.stake) || 0;
    const cOdds = Number(cover.odds) || 1;
    let ret = cStake * cOdds;
    let desc = `皇冠 ${cover.playType}${cover.lineTag} [${cover.pick}] 命中 (¥${cStake} × ${cOdds.toFixed(2)})`;

    // Special Asian handicap quarter refund on Draw:
    if (cover.playType === '胜平负' && cover.pick === '平' && hgHandicap?.lineTag?.includes('0.25')) {
      const handicapHalf = (Number(hgHandicap.stake) || 0) * 0.5;
      ret += handicapHalf;
      desc += ` + 让球退还半本 ¥${handicapHalf.toFixed(2)}`;
    }

    const net = ret + rebateTotal - totalStake;
    outcomeReturns.push({
      outcome: `皇冠 ${cover.playType} [${cover.pick}] 打出`,
      description: desc,
      returnAmount: Number(ret.toFixed(2)),
      netProfit: Number(net.toFixed(2)),
    });
  });

  const netProfits = outcomeReturns.map((o) => o.netProfit);
  const minProfit = netProfits.length > 0 ? Math.min(...netProfits) : 0;
  const baseForRoi =
    rebateConfig.roiBase === 'jc' ? totalJcStake : totalStake;
  const roiRate =
    baseForRoi > 0 ? Number(((minProfit / baseForRoi) * 100).toFixed(2)) : 0;

  return {
    totalJcStake,
    totalHgStake,
    totalStake,
    totalJcRebate,
    totalHgRebate,
    rebateTotal,
    outcomeReturns,
    expectedProfit: minProfit,
    roiRate,
  };
}

/**
 * Solves optimal hedging stakes for Parlay Full Cover Arbitrage.
 * Dynamically updates any arbitrary number of JC legs and Crown cover options!
 */
export function solveOptimalParlayStakes(
  legs: ParlayLeg[],
  hgCovers: CrownParlayCover[],
  baseLegStake: number
): {
  updatedLegs: ParlayLeg[];
  updatedHgCovers: CrownParlayCover[];
} {
  if (legs.length === 0) return { updatedLegs: legs, updatedHgCovers: hgCovers };

  const leg1 = legs[0];
  const mult1 = Number((leg1.match1Odds * leg1.match2Odds).toFixed(3));
  const targetPayout = baseLegStake * mult1;

  // Equate all JC legs payouts to targetPayout
  const updatedLegs = legs.map((l, index) => {
    const mult = Number((l.match1Odds * l.match2Odds).toFixed(3));
    const stake = index === 0 ? baseLegStake : Number((targetPayout / Math.max(0.01, mult)).toFixed(2));
    return {
      ...l,
      multiplier: mult,
      stake,
    };
  });

  // Calculate Crown covers
  const hgHandicap = hgCovers.find((c) => c.playType === '让球');
  const handicapStake = (hgHandicap && hgHandicap.odds > 0)
    ? Number((targetPayout / hgHandicap.odds).toFixed(2))
    : 0;

  const isQuarter = hgHandicap?.lineTag?.includes('0.25');
  const refundFromHandicap = isQuarter ? handicapStake * 0.5 : 0;

  const updatedHgCovers = hgCovers.map((c) => {
    if (c.playType === '让球') {
      return { ...c, stake: handicapStake };
    }
    if (c.playType === '胜平负' && c.pick === '平' && isQuarter) {
      const stake = Number(Math.max(0, (targetPayout - refundFromHandicap) / Math.max(0.01, c.odds)).toFixed(2));
      return { ...c, stake };
    }
    // Any other cover:
    const stake = Number((targetPayout / Math.max(0.01, c.odds)).toFixed(2));
    return { ...c, stake };
  });

  return { updatedLegs, updatedHgCovers };
}

export interface SingleCalcSummary {
  totalJcStake: number;
  totalHgStake: number;
  totalStake: number;
  totalJcRebate: number;
  totalHgRebate: number;
  rebateTotal: number;
  outcomeReturns: {
    id: string;
    marketName: string;
    pick: string;
    source: 'jc' | 'hg';
    stake: number;
    odds: number;
    grossReturn: number;
    netProfit: number;
  }[];
  minPayout: number;
  expectedProfit: number;
  roiRate: number;
}

/**
 * Evaluates live settlement preview for arbitrary Single Cover rows (2-way, 3-way, or multi-way)
 */
export function evaluateSingleCoverCurrentStakes(
  rows: SingleCoverRow[],
  rebateConfig: RebateConfig
): SingleCalcSummary {
  const jcRows = rows.filter((r) => r.source === 'jc');
  const hgRows = rows.filter((r) => r.source === 'hg');

  const totalJcStake = Number(
    jcRows.reduce((sum, r) => sum + (Number(r.stake) || 0), 0).toFixed(2)
  );
  const totalHgStake = Number(
    hgRows.reduce((sum, r) => sum + (Number(r.stake) || 0), 0).toFixed(2)
  );
  const totalStake = Number((totalJcStake + totalHgStake).toFixed(2));

  const totalJcRebate = Number(
    jcRows
      .reduce((sum, r) => sum + ((Number(r.stake) || 0) * (Number(r.rebateRate) || 0)) / 100, 0)
      .toFixed(2)
  );
  const totalHgRebate = Number(
    hgRows
      .reduce((sum, r) => sum + ((Number(r.stake) || 0) * (Number(r.rebateRate) || 0)) / 100, 0)
      .toFixed(2)
  );
  const rebateTotal = Number((totalJcRebate + totalHgRebate).toFixed(2));

  const outcomeReturns = rows.map((r) => {
    const stake = Number(r.stake) || 0;
    const odds = Number(r.odds) || 1;
    const grossReturn = stake * odds;
    const netProfit = grossReturn + rebateTotal - totalStake;
    return {
      id: r.id,
      marketName: r.marketName,
      pick: r.pick,
      source: r.source,
      stake,
      odds,
      grossReturn: Number(grossReturn.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
    };
  });

  const profits = outcomeReturns.map((o) => o.netProfit);
  const payouts = outcomeReturns.map((o) => o.grossReturn);

  const minPayout = payouts.length > 0 ? Math.min(...payouts) : 0;
  const expectedProfit = profits.length > 0 ? Math.min(...profits) : 0;

  const baseForRoi =
    rebateConfig.roiBase === 'jc' ? (totalJcStake || totalStake) : totalStake;
  const roiRate =
    baseForRoi > 0 ? Number(((expectedProfit / baseForRoi) * 100).toFixed(2)) : 0;

  return {
    totalJcStake,
    totalHgStake,
    totalStake,
    totalJcRebate,
    totalHgRebate,
    rebateTotal,
    outcomeReturns,
    minPayout,
    expectedProfit,
    roiRate,
  };
}

/**
 * Solves optimal hedging stakes across all active single cover options.
 */
export function solveOptimalSingleCoverStakes(
  rows: SingleCoverRow[],
  baseStake: number
): SingleCoverRow[] {
  if (rows.length === 0) return rows;

  const row1 = rows[0];
  const targetPayout = baseStake * (Number(row1.odds) || 2);

  return rows.map((r, index) => {
    const odds = Math.max(1.01, Number(r.odds) || 1);
    const stake = index === 0 ? baseStake : Number((targetPayout / odds).toFixed(2));
    return {
      ...r,
      stake,
    };
  });
}

/**
 * Format ticket slips for WeChat / SMS copy
 */
export function formatJcTicketSlip(
  title: string,
  matchInfo: string,
  items: { label: string; odds: number; stake: number; rebateRate?: number }[],
  totalStake: number
): string {
  const lines = [
    `【竞彩出票单】${title}`,
    `${matchInfo}`,
    `-----------------------`,
  ];
  items.forEach((item) => {
    const rebateStr = item.rebateRate ? ` [返${item.rebateRate}%]` : '';
    lines.push(
      `• ${item.label} @ ${item.odds.toFixed(2)}${rebateStr}  投注: ¥${Math.round(item.stake)}`
    );
  });
  lines.push(`-----------------------`);
  lines.push(`合计投注金额: ¥${Math.round(totalStake)} 元`);
  lines.push(`出票时间: ${new Date().toLocaleString('zh-CN', { hour12: false })}`);
  return lines.join('\n');
}

export function formatHgBetSlip(
  title: string,
  matchInfo: string,
  items: { label: string; odds: number; stake: number; rebateRate?: number }[],
  totalStake: number
): string {
  const lines = [
    `【皇冠对冲单】${title}`,
    `${matchInfo}`,
    `-----------------------`,
  ];
  items.forEach((item) => {
    const rebateStr = item.rebateRate ? ` [返${item.rebateRate}%]` : '';
    lines.push(
      `• ${item.label} @ ${item.odds.toFixed(2)}${rebateStr}  投注: ¥${Math.round(item.stake)}`
    );
  });
  lines.push(`-----------------------`);
  lines.push(`皇冠总投注: ¥${Math.round(totalStake)} 元`);
  lines.push(`记录时间: ${new Date().toLocaleString('zh-CN', { hour12: false })}`);
  return lines.join('\n');
}
