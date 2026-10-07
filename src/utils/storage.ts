import { BetRecord, RebateConfig } from '../types';

const REBATE_KEY = 'jc_hg_calc_rebate_config_v1';
const HISTORY_KEY = 'jc_hg_calc_bet_history_v1';

export const DEFAULT_REBATE: RebateConfig = {
  jcRebateRate: 7.0, // 7.0% default 竞彩返点
  hgRebateRate: 0.8, // 0.8% default 皇冠水钱返点
  roiBase: 'jc', // 以竞彩投注为利润率计算基准 (符合彩店惯例，亦可切至总投注)
};

export function getStoredRebateConfig(): RebateConfig {
  try {
    const raw = localStorage.getItem(REBATE_KEY);
    if (raw) {
      return { ...DEFAULT_REBATE, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to parse rebate config', e);
  }
  return DEFAULT_REBATE;
}

export function saveStoredRebateConfig(config: RebateConfig): void {
  try {
    localStorage.setItem(REBATE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save rebate config', e);
  }
}

export function getStoredHistory(): BetRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse history', e);
  }
  // Initialize with realistic mock history including the two screenshot examples
  const initialData = getInitialMockHistory();
  saveStoredHistory(initialData);
  return initialData;
}

export function saveStoredHistory(history: BetRecord[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save history', e);
  }
}

export function getInitialMockHistory(): BetRecord[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  return [
    {
      id: 'rec-1',
      timestamp: now - 3 * dayMs,
      createdAtStr: '2026-10-03 19:30',
      mode: 'goals',
      title: '进球数对冲 · 欧国联 哈萨克 VS 法罗群岛',
      matchInfo: '周二003 · 竞彩(0/1/2球) + 皇冠大2.00',
      jcStake: 10000.0,
      hgStake: 9809.68,
      totalStake: 19809.68,
      expectedProfit: 277.6,
      roiRate: 2.78,
      rebateAmount: 778.48,
      status: 'settled',
      settledResult: '比分 1-1 (总进球2个, 皇冠走水, 竞彩2球中奖)',
      settledProfit: 285.4,
      details: {
        itemsSummary: '0球@8.00(2352元), 1球@4.00(4703元), 2球@3.15(2945元), 皇冠大2.00@1.92(9810元)',
        jsonRaw: '{}',
      },
    },
    {
      id: 'rec-2',
      timestamp: now - 2 * dayMs,
      createdAtStr: '2026-10-04 22:15',
      mode: 'parlay',
      title: '全包串关对冲 · 欧国联两场双选',
      matchInfo: '爱沙尼亚VS冰岛 + 卢森堡VS保加利亚',
      jcStake: 16877.83,
      hgStake: 40174.33,
      totalStake: 57052.16,
      expectedProfit: 564.4,
      roiRate: 3.34,
      rebateAmount: 1502.84,
      status: 'settled',
      settledResult: '客胜保加利亚 0-1, JC串1中奖53960元',
      settledProfit: 564.4,
      details: {
        itemsSummary: 'JC串1(10000元@5.40倍), JC串2(6878元@7.85倍), 皇冠让球-0.25(27403元), 皇冠平局(12772元)',
        jsonRaw: '{}',
      },
    },
    {
      id: 'rec-3',
      timestamp: now - 1 * dayMs,
      createdAtStr: '2026-10-05 20:00',
      mode: 'goals',
      title: '进球数对冲 · 欧预赛 挪威 VS 奥地利',
      matchInfo: '周一006 · 竞彩(0/1/2/3球) + 皇冠大3.00',
      jcStake: 15000.0,
      hgStake: 14250.0,
      totalStake: 29250.0,
      expectedProfit: 465.0,
      roiRate: 3.1,
      rebateAmount: 1164.0,
      status: 'settled',
      settledResult: '比分 2-1 (总进球3个, 皇冠走水, 竞彩3球中)',
      settledProfit: 465.0,
      details: {
        itemsSummary: '0球@11.00, 1球@5.20, 2球@3.80, 3球@3.65, 皇冠大3.00@1.95',
        jsonRaw: '{}',
      },
    },
    {
      id: 'rec-4',
      timestamp: now - 8 * 3600 * 1000,
      createdAtStr: '2026-10-06 14:30',
      mode: 'parlay',
      title: '全包串关对冲 · 欧国联焦点战',
      matchInfo: '荷兰VS德国 + 英格兰VS芬兰',
      jcStake: 20000.0,
      hgStake: 45200.0,
      totalStake: 65200.0,
      expectedProfit: 712.0,
      roiRate: 3.56,
      rebateAmount: 1761.6,
      status: 'pending',
      details: {
        itemsSummary: 'JC串1(12000元), JC串2(8000元), 皇冠客+0.25(31200元), 皇冠平局(14000元)',
        jsonRaw: '{}',
      },
    },
  ];
}
