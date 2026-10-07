import React, { useState } from 'react';
import {
  Plus,
  Minus,
  RotateCcw,
  Copy,
  Check,
  BookmarkPlus,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Trash2,
  PlusCircle,
  Percent,
  Layers,
  Settings2,
} from 'lucide-react';
import { GoalRow, RebateConfig, BetRecord } from '../types';
import {
  evaluateGoalCountCurrentStakes,
  solveOptimalGoalCountStakes,
  formatJcTicketSlip,
  formatHgBetSlip,
} from '../utils/calculator';

interface GoalCountCalculatorProps {
  rebateConfig: RebateConfig;
  onOpenRebateModal: () => void;
  onSaveRecord: (record: Omit<BetRecord, 'id' | 'timestamp' | 'createdAtStr'>) => void;
}

const INITIAL_ROWS: GoalRow[] = [
  { id: 'jc-0', source: 'jc', goalsLabel: '0', odds: 8.0, stake: 2351.58, rebateRate: 7.0 },
  { id: 'jc-1', source: 'jc', goalsLabel: '1', odds: 4.0, stake: 4703.15, rebateRate: 7.0 },
  { id: 'jc-2', source: 'jc', goalsLabel: '2', odds: 3.15, stake: 2945.27, rebateRate: 7.0 },
  {
    id: 'hg-over',
    source: 'hg',
    goalsLabel: '大',
    odds: 1.92,
    stake: 9809.68,
    rebateRate: 0.8,
    crownLine: '大2.00',
  },
];

export const GoalCountCalculator: React.FC<GoalCountCalculatorProps> = ({
  rebateConfig,
  onOpenRebateModal,
  onSaveRecord,
}) => {
  // Match info (主队与客队自由设置)
  const [homeTeam, setHomeTeam] = useState('哈萨克');
  const [awayTeam, setAwayTeam] = useState('法罗群岛');
  const [league, setLeague] = useState('欧国联');
  const [matchTime, setMatchTime] = useState('2026-10-06 22:00');

  // Base JC Stake for auto re-balancing
  const [targetJcStake, setTargetJcStake] = useState<number>(10000.0);
  const [rows, setRows] = useState<GoalRow[]>(INITIAL_ROWS);

  // UI state
  const [showOutcomeTable, setShowOutcomeTable] = useState(false);
  const [copiedJc, setCopiedJc] = useState(false);
  const [copiedHg, setCopiedHg] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoalLabel, setNewGoalLabel] = useState('3');
  const [newGoalOdds, setNewGoalOdds] = useState('4.20');
  const [newGoalRebate, setNewGoalRebate] = useState(rebateConfig.jcRebateRate.toString());

  // 1. EVALUATE LIVE FROM CURRENT INPUTS (Settlement preview updates immediately when any stake/odds/rebate is modified)
  const calcResult = evaluateGoalCountCurrentStakes(rows, rebateConfig);

  // 2. RE-BALANCE / RE-CALCULATE OPTIMAL STAKES
  const handleRecalculate = () => {
    const updated = solveOptimalGoalCountStakes(rows, targetJcStake);
    setRows(updated);
  };

  // Adjust odds
  const updateOdds = (id: string, delta: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextOdds = Math.max(1.01, Number((r.odds + delta).toFixed(2)));
          return { ...r, odds: nextOdds };
        }
        return r;
      })
    );
  };

  const handleOddsInputChange = (id: string, value: string) => {
    const val = parseFloat(value) || 0;
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, odds: val } : r))
    );
  };

  // Adjust stake (manual input directly changes the live settlement preview!)
  const handleStakeInputChange = (id: string, value: string) => {
    const val = parseFloat(value) || 0;
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, stake: val } : r))
    );
  };

  // Adjust individual rebate % for this specific item
  const handleIndividualRebateChange = (id: string, value: string) => {
    const val = parseFloat(value) || 0;
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, rebateRate: val } : r))
    );
  };

  // Delete an item
  const handleDeleteItem = (id: string) => {
    const jcRows = rows.filter((r) => r.source === 'jc');
    if (jcRows.length <= 1 && rows.find((r) => r.id === id)?.source === 'jc') {
      alert('竞彩进球数至少需要保留 1 个投注选项！');
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Add a new goal item
  const handleAddGoalItem = () => {
    const exists = rows.some((r) => r.source === 'jc' && r.goalsLabel === newGoalLabel);
    if (exists) {
      alert(`进球数 ${newGoalLabel}球 已存在列表中！`);
      return;
    }

    const newRow: GoalRow = {
      id: `jc-${Date.now()}-${newGoalLabel}`,
      source: 'jc',
      goalsLabel: newGoalLabel,
      odds: parseFloat(newGoalOdds) || 3.5,
      stake: 2000,
      rebateRate: parseFloat(newGoalRebate) || rebateConfig.jcRebateRate,
    };

    // Keep JC rows sorted by goal count, followed by Crown row
    setRows((prev) => {
      const hgRow = prev.find((r) => r.source === 'hg');
      const jcList = [...prev.filter((r) => r.source === 'jc'), newRow].sort((a, b) => {
        const ga = parseInt(a.goalsLabel, 10) || 99;
        const gb = parseInt(b.goalsLabel, 10) || 99;
        return ga - gb;
      });
      return hgRow ? [...jcList, hgRow] : jcList;
    });

    setShowAddModal(false);
  };

  // Quick add standard goal count (e.g. 3球, 4球)
  const handleQuickAdd = (goal: string, defaultOdds: number) => {
    const exists = rows.some((r) => r.source === 'jc' && r.goalsLabel === goal);
    if (exists) return;

    const newRow: GoalRow = {
      id: `jc-${Date.now()}-${goal}`,
      source: 'jc',
      goalsLabel: goal,
      odds: defaultOdds,
      stake: 1500,
      rebateRate: rebateConfig.jcRebateRate,
    };

    setRows((prev) => {
      const hgRow = prev.find((r) => r.source === 'hg');
      const jcList = [...prev.filter((r) => r.source === 'jc'), newRow].sort((a, b) => {
        const ga = parseInt(a.goalsLabel, 10) || 99;
        const gb = parseInt(b.goalsLabel, 10) || 99;
        return ga - gb;
      });
      return hgRow ? [...jcList, hgRow] : jcList;
    });
  };

  // Change Crown Handicap Line
  const handleChangeCrownLine = (newLine: string) => {
    setRows((prev) =>
      prev.map((r) => (r.source === 'hg' ? { ...r, crownLine: newLine } : r))
    );
  };

  // Batch sync default rebate rate to all JC options
  const handleBatchSyncRebate = () => {
    setRows((prev) =>
      prev.map((r) =>
        r.source === 'jc'
          ? { ...r, rebateRate: rebateConfig.jcRebateRate }
          : { ...r, rebateRate: rebateConfig.hgRebateRate }
      )
    );
  };

  // Copy JC Ticket Slip
  const handleCopyJc = () => {
    const jcItems = rows
      .filter((r) => r.source === 'jc')
      .map((r) => ({
        label: `${r.goalsLabel}球`,
        odds: r.odds,
        stake: r.stake,
        rebateRate: r.rebateRate,
      }));
    const totalJc = jcItems.reduce((s, i) => s + i.stake, 0);
    const slip = formatJcTicketSlip(
      `进球数对冲`,
      `[${league}] 主队: ${homeTeam} VS 客队: ${awayTeam} (${matchTime})`,
      jcItems,
      totalJc
    );
    navigator.clipboard.writeText(slip);
    setCopiedJc(true);
    setTimeout(() => setCopiedJc(false), 2000);
  };

  // Copy Crown Bet Slip
  const handleCopyHg = () => {
    const hgItems = rows
      .filter((r) => r.source === 'hg')
      .map((r) => ({
        label: `${r.crownLine || '大小球'} [${r.goalsLabel}]`,
        odds: r.odds,
        stake: r.stake,
        rebateRate: r.rebateRate,
      }));
    const totalHg = hgItems.reduce((s, i) => s + i.stake, 0);
    const slip = formatHgBetSlip(
      `大小球对冲`,
      `[${league}] 主队: ${homeTeam} VS 客队: ${awayTeam} (${matchTime})`,
      hgItems,
      totalHg
    );
    navigator.clipboard.writeText(slip);
    setCopiedHg(true);
    setTimeout(() => setCopiedHg(false), 2000);
  };

  // Save to history
  const handleSaveToHistory = () => {
    const jcSummary = rows
      .filter((r) => r.source === 'jc')
      .map((r) => `${r.goalsLabel}球@${r.odds}(¥${r.stake},返${r.rebateRate}%)`)
      .join(', ');
    const hgSummary = rows
      .filter((r) => r.source === 'hg')
      .map((r) => `${r.crownLine}@${r.odds}(¥${r.stake},返${r.rebateRate}%)`)
      .join(', ');

    onSaveRecord({
      mode: 'goals',
      title: `进球数对冲 · ${homeTeam} VS ${awayTeam}`,
      matchInfo: `[${homeTeam} VS ${awayTeam}] · 竞彩+皇冠${rows.find((r) => r.source === 'hg')?.crownLine || '大小球'}`,
      jcStake: calcResult.totalJcStake,
      hgStake: calcResult.totalHgStake,
      totalStake: calcResult.totalStake,
      expectedProfit: calcResult.expectedProfit,
      roiRate: calcResult.roiRate,
      rebateAmount: calcResult.rebateTotal,
      status: 'pending',
      details: {
        itemsSummary: `${jcSummary} | 皇冠: ${hgSummary}`,
        jsonRaw: JSON.stringify({ rows, targetJcStake, rebateConfig }),
      },
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const existingJcGoals = rows.filter((r) => r.source === 'jc').map((r) => r.goalsLabel);
  const quickCandidates = [
    { label: '0', odds: 8.0 },
    { label: '1', odds: 4.0 },
    { label: '2', odds: 3.15 },
    { label: '3', odds: 4.2 },
    { label: '4', odds: 6.5 },
    { label: '5', odds: 12.0 },
    { label: '6', odds: 25.0 },
    { label: '7+', odds: 40.0 },
  ].filter((c) => !existingJcGoals.includes(c.label));

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-28">
      {/* Top Match Card (主队与客队自由设置) */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-purple-100/80 relative overflow-hidden space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1 text-xs">
            {/* Badges row */}
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                进球数对冲
              </span>
              <span className="text-slate-400 text-[11px]">可点击下方直接修改主客队名</span>
            </div>

            {/* Editable Home VS Away */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={league}
                  onChange={(e) => setLeague(e.target.value)}
                  className="w-20 px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-700"
                  placeholder="联赛名称"
                />
                <input
                  type="text"
                  value={matchTime}
                  onChange={(e) => setMatchTime(e.target.value)}
                  className="flex-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-mono text-slate-500"
                  placeholder="比赛时间"
                />
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-slate-400 text-xs">主队:</span>
                <input
                  type="text"
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:ring-1 focus:ring-purple-500"
                  placeholder="主队名称"
                />
                <span className="text-purple-700 font-extrabold text-sm px-1">VS</span>
                <span className="text-slate-400 text-xs">客队:</span>
                <input
                  type="text"
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:ring-1 focus:ring-purple-500"
                  placeholder="客队名称"
                />
              </div>
            </div>
          </div>

          {/* Top Right Profit Badge */}
          <div className="bg-gradient-to-br from-pink-600 via-rose-600 to-purple-700 text-white rounded-2xl px-4 py-2.5 text-center shadow-md shadow-pink-500/20 shrink-0">
            <div className="text-[10px] font-medium text-pink-100 mb-0.5">利润率</div>
            <div className="text-lg font-extrabold font-mono tracking-tight">
              {calcResult.roiRate > 0 ? `+${calcResult.roiRate.toFixed(2)}%` : `${calcResult.roiRate.toFixed(2)}%`}
            </div>
          </div>
        </div>

        {/* Quick Config Bar */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">配平基准:</span>
            {[5000, 10000, 20000].map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  setTargetJcStake(amt);
                  const fresh = solveOptimalGoalCountStakes(rows, amt);
                  setRows(fresh);
                }}
                className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-colors ${
                  targetJcStake === amt
                    ? 'bg-purple-100 text-purple-800 font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ¥{amt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchSyncRebate}
              title="将全局默认返点一键应用到当前所有选项"
              className="text-[11px] text-slate-600 hover:text-purple-700 bg-slate-100 hover:bg-purple-50 px-2 py-1 rounded-lg transition-colors font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              同步默认返点
            </button>
            <button
              onClick={onOpenRebateModal}
              className="flex items-center gap-1 text-[11px] text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-lg transition-colors font-medium"
            >
              <SlidersHorizontal className="w-3 h-3" />
              全局返点
            </button>
          </div>
        </div>
      </div>

      {/* Rows Container (Screenshot 1: 0球, 1球, 2球, 皇冠大2.00, etc.) */}
      <div className="space-y-3">
        {rows.map((row) => {
          const isJc = row.source === 'jc';
          return (
            <div
              key={row.id}
              className="bg-white rounded-2xl p-3 shadow-xs border border-purple-50 space-y-2 transition-shadow hover:shadow-sm"
            >
              {/* Main row */}
              <div className="flex items-center gap-2.5">
                {/* Left Badge: Coral for JC, Purple for Crown */}
                <div
                  className={`w-16 py-2 px-1 rounded-xl text-center text-white shrink-0 shadow-xs ${
                    isJc
                      ? 'bg-gradient-to-b from-orange-400 to-orange-500'
                      : 'bg-gradient-to-b from-purple-700 to-purple-800'
                  }`}
                >
                  <div className="text-[11px] font-bold leading-tight">
                    {isJc ? '竞彩' : '皇冠'}
                  </div>
                  <div className="text-[10px] opacity-90 leading-tight">
                    {isJc ? '进球数' : (row.crownLine || '大小球')}
                  </div>
                </div>

                {/* Middle Selection & Odds Stepper (Peach/cream container) */}
                <div className="flex-1 bg-amber-50/50 rounded-2xl p-1.5 flex items-center justify-between border border-amber-100/70">
                  {/* Goal Tag bubble (可自由输入球数标签) */}
                  <input
                    type="text"
                    value={row.goalsLabel}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, goalsLabel: v } : r)));
                    }}
                    className={`w-8 h-7 text-center rounded-full font-bold text-xs text-white shrink-0 shadow-xs focus:outline-none focus:ring-1 focus:ring-white ${
                      isJc ? 'bg-orange-500' : 'bg-purple-700'
                    }`}
                    title="进球数标识（可直接修改）"
                  />

                  {/* Minus button */}
                  <button
                    type="button"
                    onClick={() => updateOdds(row.id, -0.05)}
                    className="w-6 h-6 rounded-full bg-white text-slate-600 hover:text-purple-700 hover:bg-purple-50 flex items-center justify-center shadow-xs border border-slate-200 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  {/* Odds numeric display/input */}
                  <div className="px-1 text-center">
                    <input
                      type="number"
                      step="0.01"
                      min="1.01"
                      value={row.odds}
                      onChange={(e) => handleOddsInputChange(row.id, e.target.value)}
                      className="w-16 text-center font-mono font-extrabold text-base text-amber-700 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-400 rounded"
                    />
                  </div>

                  {/* Plus button */}
                  <button
                    type="button"
                    onClick={() => updateOdds(row.id, 0.05)}
                    className="w-6 h-6 rounded-full bg-purple-700 text-white hover:bg-purple-800 flex items-center justify-center shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Right Bet Amount Box (Manual adjustment live-updates 结算预览!) */}
                <div className="w-28 bg-slate-100/80 rounded-2xl p-1.5 px-2 text-right shrink-0 border border-slate-200/60">
                  <div className="text-[10px] text-slate-500 font-medium">投注金额</div>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={row.stake}
                      onChange={(e) => handleStakeInputChange(row.id, e.target.value)}
                      className="w-full text-right font-mono font-bold text-sm text-slate-800 bg-transparent focus:outline-none focus:ring-1 focus:ring-purple-400 rounded"
                    />
                  </div>
                </div>

                {/* Delete button (JC item deletion requested by user!) */}
                {isJc && (
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(row.id)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0"
                    title={`删除 ${row.goalsLabel}球 选项`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Individual Rebate & Option Setting Bar */}
              <div className="flex items-center justify-between text-xs px-1 pt-1 border-t border-slate-100">
                {/* Individual rebate setting */}
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Percent className="w-3 h-3 text-orange-500" />
                  <span className="text-[11px] font-medium">该项单独返点:</span>
                  <div className="relative inline-flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="25"
                      value={row.rebateRate ?? (isJc ? rebateConfig.jcRebateRate : rebateConfig.hgRebateRate)}
                      onChange={(e) => handleIndividualRebateChange(row.id, e.target.value)}
                      className="w-14 text-center px-1 py-0.5 bg-orange-50 border border-orange-200 rounded-md font-mono text-[11px] font-bold text-orange-800 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    />
                    <span className="ml-1 text-[11px] text-slate-400">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    (返 ¥{(((Number(row.stake) || 0) * (Number(row.rebateRate) || 0)) / 100).toFixed(1)})
                  </span>
                </div>

                {/* If Crown row: Crown Line Selector */}
                {!isJc && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500">盘口:</span>
                    <select
                      value={row.crownLine || '大2.00'}
                      onChange={(e) => handleChangeCrownLine(e.target.value)}
                      className="bg-purple-50 border border-purple-200 text-purple-900 text-[11px] font-semibold rounded-md px-1.5 py-0.5 focus:outline-none"
                    >
                      <option value="大1.50">大1.50</option>
                      <option value="大1.75">大1.75</option>
                      <option value="大2.00">大2.00 (整球走水)</option>
                      <option value="大2.25">大2.25</option>
                      <option value="大2.50">大2.50</option>
                      <option value="大2.75">大2.75</option>
                      <option value="大3.00">大3.00 (整球走水)</option>
                      <option value="大3.50">大3.50</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Items Toolbar (Requested: 增加可删除和添加项目的选项) */}
      <div className="bg-purple-50/60 rounded-2xl p-3 border border-purple-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 text-[11px] font-medium">快速添加选项:</span>
          {quickCandidates.slice(0, 4).map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => handleQuickAdd(c.label, c.odds)}
              className="px-2 py-1 bg-white hover:bg-orange-50 hover:border-orange-300 text-slate-700 hover:text-orange-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
            >
              <Plus className="w-3 h-3 text-orange-500" />
              {c.label}球
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1 bg-gradient-to-r from-purple-700 to-purple-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs hover:from-purple-800 hover:to-purple-900 transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          自定义添加选项
        </button>
      </div>

      {/* 结算预览 (Settlement Preview - LIVE recalculated from modified stakes!) */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-purple-100 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">结算预览</h3>
            <p className="text-xs text-slate-400">
              根据上方手动调整后的金额与返点实时重新计算
            </p>
          </div>
          <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl px-4 py-2 text-center shadow-sm">
            <div className="text-[10px] font-medium text-pink-100">预计保底利润</div>
            <div className="text-base font-extrabold font-mono">
              ¥{calcResult.expectedProfit.toFixed(2)}
            </div>
          </div>
        </div>

        {/* 4 Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: 竞彩投注金额 */}
          <div className="bg-amber-50/40 rounded-2xl p-3 border border-amber-100/60">
            <div className="text-xs text-slate-500 font-medium mb-1">竞彩投注金额</div>
            <div className="text-lg font-extrabold font-mono text-slate-900">
              {calcResult.totalJcStake.toFixed(2)}
            </div>
            <div className="text-[10px] text-amber-700 mt-0.5">
              各单项独立返点和: +¥{calcResult.totalJcRebate.toFixed(2)}
            </div>
          </div>

          {/* Card 2: 皇冠投注金额 */}
          <div className="bg-purple-50/40 rounded-2xl p-3 border border-purple-100/60">
            <div className="text-xs text-slate-500 font-medium mb-1">皇冠投注金额</div>
            <div className="text-lg font-extrabold font-mono text-slate-900">
              {calcResult.totalHgStake.toFixed(2)}
            </div>
            <div className="text-[10px] text-purple-700 mt-0.5">
              皇冠返水: +¥{calcResult.totalHgRebate.toFixed(2)}
            </div>
          </div>

          {/* Card 3: 预计保底利润 */}
          <div className="bg-pink-50/40 rounded-2xl p-3 border border-pink-100/60">
            <div className="text-xs text-slate-500 font-medium mb-1">竞彩预计利润</div>
            <div className={`text-lg font-extrabold font-mono ${calcResult.expectedProfit >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              ¥{calcResult.expectedProfit.toFixed(2)}
            </div>
            <div className="text-[10px] text-pink-700 mt-0.5">
              总投入: ¥{calcResult.totalStake.toFixed(2)}
            </div>
          </div>

          {/* Card 4: 利润率 */}
          <div className="bg-indigo-50/40 rounded-2xl p-3 border border-indigo-100/60">
            <div className="text-xs text-slate-500 font-medium mb-1">
              利润率 {rebateConfig.roiBase === 'jc' ? '(基于JC)' : '(基于总投)'}
            </div>
            <div className={`text-lg font-extrabold font-mono ${calcResult.roiRate >= 0 ? 'text-indigo-900' : 'text-rose-600'}`}>
              {calcResult.roiRate > 0 ? `+${calcResult.roiRate.toFixed(2)}%` : `${calcResult.roiRate.toFixed(2)}%`}
            </div>
            <div className="text-[10px] text-indigo-700 mt-0.5">
              总返点总额: +¥{calcResult.rebateTotal.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Detailed Outcome Matrix Accordion */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowOutcomeTable(!showOutcomeTable)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 hover:text-purple-700 transition-colors py-1"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              查看各进球数赛果实得回报明细 ({calcResult.payoutPerOutcome.map(p => p.label).join(' / ')})
            </span>
            {showOutcomeTable ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showOutcomeTable && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">赛果情况</th>
                    <th className="py-2 px-3">判定明细</th>
                    <th className="py-2 px-3 text-right">总返还金额</th>
                    <th className="py-2 px-3 text-right">含返点净利润</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {calcResult.payoutPerOutcome.map((item, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/30">
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">
                        {item.label}
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-500 text-[11px]">
                        {item.description}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700 font-semibold">
                        ¥{item.payout.toFixed(2)}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-bold ${
                          item.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {item.netProfit >= 0
                          ? `+¥${item.netProfit.toFixed(2)}`
                          : `-¥${Math.abs(item.netProfit).toFixed(2)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Action Bar (Screenshot 1: 重新计算, 竞彩复制 + extra actions) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-purple-100 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          {/* 重新计算 (Purple main button: auto-rebalances stakes) */}
          <button
            type="button"
            onClick={handleRecalculate}
            className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-md shadow-purple-900/20 active:scale-[0.98] transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            重新对冲配平
          </button>

          {/* 竞彩复制 */}
          <button
            type="button"
            onClick={handleCopyJc}
            className="flex-1 h-12 rounded-2xl bg-white hover:bg-purple-50 text-purple-900 border-2 border-purple-800/80 font-bold text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
          >
            {copiedJc ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-600">已复制竞彩</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-purple-800" />
                竞彩复制
              </>
            )}
          </button>

          {/* 皇冠复制 */}
          <button
            type="button"
            onClick={handleCopyHg}
            className="h-12 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center justify-center gap-1 transition-colors"
          >
            {copiedHg ? <Check className="w-4 h-4 text-emerald-600" /> : '皇冠复制'}
          </button>

          {/* 保存记录 */}
          <button
            type="button"
            onClick={handleSaveToHistory}
            className={`h-12 px-3.5 rounded-2xl font-semibold text-xs flex items-center justify-center gap-1 transition-all ${
              savedSuccess
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-purple-100 hover:bg-purple-200 text-purple-900'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                已存
              </>
            ) : (
              <>
                <BookmarkPlus className="w-4 h-4" />
                存单
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add Custom Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-purple-100">
            <h3 className="text-base font-bold text-slate-900">
              添加进球数投注选项
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  选择进球数
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['0', '1', '2', '3', '4', '5', '6', '7+'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setNewGoalLabel(g)}
                      className={`py-2 text-xs font-bold rounded-xl transition-all ${
                        newGoalLabel === g
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {g}球
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  初始赔率
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={newGoalOdds}
                  onChange={(e) => setNewGoalOdds(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  该选项独立返点 (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newGoalRebate}
                  onChange={(e) => setNewGoalRebate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddGoalItem}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-700 to-purple-800 rounded-xl shadow-md transition-all hover:from-purple-800"
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
