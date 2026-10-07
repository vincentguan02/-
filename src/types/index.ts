export interface RebateConfig {
  jcRebateRate: number; // e.g. 7.0 for 7%
  hgRebateRate: number; // e.g. 0.8 for 0.8%
  roiBase: 'jc' | 'total'; // 'jc' for 竞彩投注金额基准, 'total' for 总投注基准
}

export type CalcMode = 'goals' | 'parlay' | 'single' | 'history';

export interface GoalRow {
  id: string;
  source: 'jc' | 'hg';
  goalsLabel: string; // "0", "1", "2", "3", "4", "5", "6", "7+" or "大"
  odds: number;
  stake: number;
  rebateRate: number; // Individual rebate % for this specific option
  crownLine?: string; // e.g. "大2.00", "大2.25", "大2.50"
}

export interface ParlayLeg {
  id: string;
  name: string; // e.g. "JC串1", "JC串2"
  multiplier: number;
  match1Name: string;
  match1Pick: string;
  match1Odds: number;
  match2Name: string;
  match2Pick: string;
  match2Odds: number;
  stake: number;
  rebateRate: number; // Individual rebate % for this JC parlay
}

export interface CrownParlayCover {
  id: string;
  playType: string; // e.g. "让球", "胜平负"
  lineTag: string; // e.g. "-0.25", "平"
  pick: string; // e.g. "主", "平"
  odds: number;
  stake: number;
  rebateRate: number; // Individual rebate % for this Crown cover
}

export interface SingleCoverRow {
  id: string;
  source: 'jc' | 'hg';
  marketName: string; // e.g. "竞彩 主胜", "皇冠 客+0.5"
  pick: string;
  odds: number;
  stake: number;
  rebateRate: number;
}

export interface BetRecord {
  id: string;
  timestamp: number;
  createdAtStr: string;
  mode: 'goals' | 'parlay' | 'single';
  title: string;
  matchInfo: string;
  jcStake: number;
  hgStake: number;
  totalStake: number;
  expectedProfit: number;
  roiRate: number; // percentage, e.g. 2.78
  rebateAmount: number;
  status: 'pending' | 'settled';
  settledResult?: string;
  settledProfit?: number;
  details: {
    itemsSummary: string;
    jsonRaw: string;
  };
}
