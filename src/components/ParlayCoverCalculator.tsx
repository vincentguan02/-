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
  Percent,
  Layers,
  Trash2,
  PlusCircle,
  Edit3,
} from 'lucide-react';
import { ParlayLeg, CrownParlayCover, RebateConfig, BetRecord } from '../types';
import {
  evaluateParlayCurrentStakes,
  solveOptimalParlayStakes,
  formatJcTicketSlip,
  formatHgBetSlip,
} from '../utils/calculator';

interface ParlayCoverCalculatorProps {
  rebateConfig: RebateConfig;
  onOpenRebateModal: () => void;
  onSaveRecord: (record: Omit<BetRecord, 'id' | 'timestamp' | 'createdAtStr'>) => void;
}

const INITIAL_LEGS: ParlayLeg[] = [
  {
    id: 'jc-leg-1',
    name: 'JC串1',
    multiplier: 5.4,
    match1Name: '爱沙尼亚 VS 冰岛',
    match1Pick: '负 (冰岛胜)',
    match1Odds: 1.52,
    match2Name: '卢森堡 VS 保加利亚',
    match2Pick: '负 (保加利亚胜)',
    match2Odds: 3.55,
    stake: 10000.0,
    rebateRate: 7.0,
  },
  {
    id: 'jc-leg-2',
    name: 'JC串2',
    multiplier: 7.85,
    match1Name: '爱沙尼亚 VS 冰岛',
    match1Pick: '+1胜 (爱沙尼亚让胜)',
    match1Odds: 2.21,
    match2Name: '卢森堡 VS 保加利亚',
    match2Pick: '负 (保加利亚胜)',
    match2Odds: 3.55,
    stake: 6877.83,
    rebateRate: 7.0,
  },
];

const INITIAL_HG_COVERS: CrownParlayCover[] = [
  {
    id: 'hg-cover-1',
    playType: '让球',
    lineTag: '-0.25',
    pick: '主胜',
    odds: 1.97,
    stake: 27402.55,
    rebateRate: 0.8,
  },
  {
    id: 'hg-cover-2',
    playType: '胜平负',
    lineTag: '平局',
    pick: '平',
    odds: 3.15,
    stake: 12771.78,
    rebateRate: 0.8,
  },
];

export const ParlayCoverCalculator: React.FC<ParlayCoverCalculatorProps> = ({
  rebateConfig,
  onOpenRebateModal,
  onSaveRecord,
}) => {
  // Matches info (主队与客队直接设置)
  const [match1Home, setMatch1Home] = useState('爱沙尼亚');
  const [match1Away, setMatch1Away] = useState('冰岛');
  const [match1League, setMatch1League] = useState('欧国联');
  const [match1Time, setMatch1Time] = useState('2026-10-07 02:45');

  const [match2Home, setMatch2Home] = useState('卢森堡');
  const [match2Away, setMatch2Away] = useState('保加利亚');
  const [match2League, setMatch2League] = useState('欧国联');
  const [match2Time, setMatch2Time] = useState('2026-10-07 02:45');

  const [baseLegStake, setBaseLegStake] = useState<number>(10000.0);
  const [legs, setLegs] = useState<ParlayLeg[]>(INITIAL_LEGS);
  const [hgCovers, setHgCovers] = useState<CrownParlayCover[]>(INITIAL_HG_COVERS);

  // Modals for adding options
  const [showAddLegModal, setShowAddLegModal] = useState(false);
  const [newLegName, setNewLegName] = useState('JC串3');
  const [newLegPick1, setNewLegPick1] = useState('平局');
  const [newLegOdds1, setNewLegOdds1] = useState('3.10');
  const [newLegPick2, setNewLegPick2] = useState('负');
  const [newLegOdds2, setNewLegOdds2] = useState('3.55');
  const [newLegCustomMultiplier, setNewLegCustomMultiplier] = useState('');
  const [newLegRebate, setNewLegRebate] = useState(rebateConfig.jcRebateRate.toString());

  const [showAddCoverModal, setShowAddCoverModal] = useState(false);
  const [newCoverType, setNewCoverType] = useState('胜平负');
  const [newCoverTag, setNewCoverTag] = useState('主胜');
  const [newCoverPick, setNewCoverPick] = useState('主');
  const [newCoverOdds, setNewCoverOdds] = useState('2.45');
  const [newCoverRebate, setNewCoverRebate] = useState(rebateConfig.hgRebateRate.toString());

  const [showOutcomeTable, setShowOutcomeTable] = useState(false);
  const [copiedJc, setCopiedJc] = useState(false);
  const [copiedHg, setCopiedHg] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // 1. LIVE SETTLEMENT EVALUATION: Evaluates directly from currently edited stakes, multipliers & options!
  const calcResult = evaluateParlayCurrentStakes(legs, hgCovers, rebateConfig);

  // 2. RE-BALANCE / RE-CALCULATE OPTIMAL STAKES
  const handleRecalculate = () => {
    const { updatedLegs, updatedHgCovers } = solveOptimalParlayStakes(
      legs,
      hgCovers,
      baseLegStake
    );
    setLegs(updatedLegs);
    setHgCovers(updatedHgCovers);
  };

  // Adjust leg name
  const handleLegNameChange = (id: string, name: string) => {
    setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
  };

  // DIRECTLY EDIT MULTIPLIER (串单倍数自由修改)
  const handleLegMultiplierChange = (id: string, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setLegs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, multiplier: val } : l))
    );
  };

  // Directly edit match1Pick and match2Pick (投注项目自由修改)
  const handleLegPick1Change = (id: string, match1Pick: string) => {
    setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, match1Pick } : l)));
  };

  const handleLegPick2Change = (id: string, match2Pick: string) => {
    setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, match2Pick } : l)));
  };

  // Adjust match1 odds in leg
  const updateLegMatch1Odds = (legId: string, delta: number) => {
    setLegs((prev) =>
      prev.map((l) => {
        if (l.id === legId) {
          const nextOdds = Math.max(1.01, Number((l.match1Odds + delta).toFixed(2)));
          return {
            ...l,
            match1Odds: nextOdds,
            multiplier: Number((nextOdds * l.match2Odds).toFixed(2)),
          };
        }
        return l;
      })
    );
  };

  // Adjust match2 odds
  const updateLegMatch2Odds = (delta: number) => {
    setLegs((prev) =>
      prev.map((l) => {
        const nextOdds = Math.max(1.01, Number((l.match2Odds + delta).toFixed(2)));
        return {
          ...l,
          match2Odds: nextOdds,
          multiplier: Number((l.match1Odds * nextOdds).toFixed(2)),
        };
      })
    );
  };

  // Adjust Crown odds
  const updateHgOdds = (coverId: string, delta: number) => {
    setHgCovers((prev) =>
      prev.map((c) => {
        if (c.id === coverId) {
          const nextOdds = Math.max(1.01, Number((c.odds + delta).toFixed(2)));
          return { ...c, odds: nextOdds };
        }
        return c;
      })
    );
  };

  // Directly edit Crown cover items (playType, lineTag, pick)
  const handleCoverTypeChange = (id: string, playType: string) => {
    setHgCovers((prev) => prev.map((c) => (c.id === id ? { ...c, playType } : c)));
  };

  const handleCoverTagChange = (id: string, lineTag: string) => {
    setHgCovers((prev) => prev.map((c) => (c.id === id ? { ...c, lineTag } : c)));
  };

  const handleCoverPickChange = (id: string, pick: string) => {
    setHgCovers((prev) => prev.map((c) => (c.id === id ? { ...c, pick } : c)));
  };

  // Individual rebate handlers
  const handleLegRebateChange = (legId: string, value: string) => {
    const val = parseFloat(value) || 0;
    setLegs((prev) =>
      prev.map((l) => (l.id === legId ? { ...l, rebateRate: val } : l))
    );
  };

  const handleCoverRebateChange = (coverId: string, value: string) => {
    const val = parseFloat(value) || 0;
    setHgCovers((prev) =>
      prev.map((c) => (c.id === coverId ? { ...c, rebateRate: val } : c))
    );
  };

  // Batch sync default rebates
  const handleBatchSyncRebate = () => {
    setLegs((prev) =>
      prev.map((l) => ({ ...l, rebateRate: rebateConfig.jcRebateRate }))
    );
    setHgCovers((prev) =>
      prev.map((c) => ({ ...c, rebateRate: rebateConfig.hgRebateRate }))
    );
  };

  // DELETE JC Leg
  const handleDeleteLeg = (id: string) => {
    if (legs.length <= 1) {
      alert('竞彩串关至少需保留 1 个组合！');
      return;
    }
    setLegs((prev) => prev.filter((l) => l.id !== id));
  };

  // DELETE Crown Cover
  const handleDeleteCover = (id: string) => {
    if (hgCovers.length <= 1) {
      alert('皇冠对冲项至少需保留 1 个选项！');
      return;
    }
    setHgCovers((prev) => prev.filter((c) => c.id !== id));
  };

  // ADD JC Leg
  const handleAddLeg = () => {
    const o1 = parseFloat(newLegOdds1) || 2.0;
    const o2 = parseFloat(newLegOdds2) || 2.0;
    const computedMult = Number((o1 * o2).toFixed(2));
    const finalMult = parseFloat(newLegCustomMultiplier) || computedMult;

    const targetPayout = (legs[0]?.stake || 10000) * (legs[0]?.multiplier || 5.4);
    const stake = Number((targetPayout / Math.max(0.1, finalMult)).toFixed(2));

    const newLeg: ParlayLeg = {
      id: `jc-leg-${Date.now()}`,
      name: newLegName || `JC串${legs.length + 1}`,
      multiplier: finalMult,
      match1Name: `${match1Home} VS ${match1Away}`,
      match1Pick: newLegPick1,
      match1Odds: o1,
      match2Name: `${match2Home} VS ${match2Away}`,
      match2Pick: newLegPick2,
      match2Odds: o2,
      stake,
      rebateRate: parseFloat(newLegRebate) || rebateConfig.jcRebateRate,
    };

    setLegs((prev) => [...prev, newLeg]);
    setShowAddLegModal(false);
    setNewLegCustomMultiplier('');
  };

  // ADD Crown Cover
  const handleAddCover = () => {
    const odds = parseFloat(newCoverOdds) || 2.0;
    const targetPayout = (legs[0]?.stake || 10000) * (legs[0]?.multiplier || 5.4);
    const stake = Number((targetPayout / Math.max(0.1, odds)).toFixed(2));

    const newCover: CrownParlayCover = {
      id: `hg-cover-${Date.now()}`,
      playType: newCoverType,
      lineTag: newCoverTag,
      pick: newCoverPick,
      odds,
      stake,
      rebateRate: parseFloat(newCoverRebate) || rebateConfig.hgRebateRate,
    };

    setHgCovers((prev) => [...prev, newCover]);
    setShowAddCoverModal(false);
  };

  // Copy JC Ticket Slip
  const handleCopyJc = () => {
    const lines = [
      `【竞彩2串1出票单】全包对冲`,
      `比赛A: [${match1League}] 主队: ${match1Home} VS 客队: ${match1Away} (${match1Time})`,
      `比赛B: [${match2League}] 主队: ${match2Home} VS 客队: ${match2Away} (${match2Time})`,
      `---------------------------------`,
    ];
    legs.forEach((l) => {
      lines.push(
        `• ${l.name}: [${match1Home} ${l.match1Pick} @${l.match1Odds}] × [${match2Home} ${l.match2Pick} @${l.match2Odds}] = ${l.multiplier.toFixed(2)}倍 | 投注: ¥${Math.round(l.stake)} [返${l.rebateRate}%]`
      );
    });
    lines.push(`---------------------------------`);
    lines.push(`竞彩总投注: ¥${Math.round(calcResult.totalJcStake)} 元`);
    lines.push(`出票时间: ${new Date().toLocaleString('zh-CN', { hour12: false })}`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedJc(true);
    setTimeout(() => setCopiedJc(false), 2000);
  };

  // Copy Crown Slip
  const handleCopyHg = () => {
    const lines = [
      `【皇冠对冲单】全包对冲`,
      `对阵: [${match2League}] 主队: ${match2Home} VS 客队: ${match2Away}`,
      `比赛时间: ${match2Time}`,
      `---------------------------------`,
      ...hgCovers.map(
        (c) =>
          `• 玩法: ${c.playType} ${c.lineTag} [${c.pick}] @${c.odds.toFixed(2)} | 投注: ¥${Math.round(c.stake)} [返${c.rebateRate}%]`
      ),
      `---------------------------------`,
      `皇冠总投注: ¥${Math.round(calcResult.totalHgStake)} 元`,
      `出票时间: ${new Date().toLocaleString('zh-CN', { hour12: false })}`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedHg(true);
    setTimeout(() => setCopiedHg(false), 2000);
  };

  // Save to history
  const handleSaveToHistory = () => {
    const jcSummary = legs
      .map((l) => `${l.name}(${l.multiplier}倍,¥${l.stake},返${l.rebateRate}%)`)
      .join(', ');
    const hgSummary = hgCovers
      .map((c) => `${c.playType}${c.lineTag}(¥${c.stake},返${c.rebateRate}%)`)
      .join(', ');

    onSaveRecord({
      mode: 'parlay',
      title: `全包串关对冲 · ${match1Home} & ${match2Home}`,
      matchInfo: `[${match1Home}VS${match1Away}] + [${match2Home}VS${match2Away}] · ${legs.length}串关对冲`,
      jcStake: calcResult.totalJcStake,
      hgStake: calcResult.totalHgStake,
      totalStake: calcResult.totalStake,
      expectedProfit: calcResult.expectedProfit,
      roiRate: calcResult.roiRate,
      rebateAmount: calcResult.rebateTotal,
      status: 'pending',
      details: {
        itemsSummary: `${jcSummary} | 皇冠: ${hgSummary}`,
        jsonRaw: JSON.stringify({ legs, hgCovers, baseLegStake, rebateConfig }),
      },
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-28">
      {/* Top Match Card (主队与客队自由编辑，取消机械场次代号) */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-purple-100/80 relative overflow-hidden space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-xs">
                竞彩全包串关
              </span>
              <span className="text-slate-400 text-[11px]">可点击下方直接修改主客队名</span>
            </div>

            {/* Match 1 Home VS Away editable block */}
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                  比赛A
                </span>
                <input
                  type="text"
                  value={match1League}
                  onChange={(e) => setMatch1League(e.target.value)}
                  className="w-16 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-700"
                  placeholder="联赛"
                />
                <input
                  type="text"
                  value={match1Time}
                  onChange={(e) => setMatch1Time(e.target.value)}
                  className="flex-1 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-mono text-slate-500"
                  placeholder="比赛时间"
                />
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-slate-400 text-[11px]">主队:</span>
                <input
                  type="text"
                  value={match1Home}
                  onChange={(e) => setMatch1Home(e.target.value)}
                  className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-purple-500"
                  placeholder="主队"
                />
                <span className="text-purple-700 font-extrabold text-xs px-1">VS</span>
                <span className="text-slate-400 text-[11px]">客队:</span>
                <input
                  type="text"
                  value={match1Away}
                  onChange={(e) => setMatch1Away(e.target.value)}
                  className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-purple-500"
                  placeholder="客队"
                />
              </div>
            </div>

            {/* Match 2 Home VS Away editable block */}
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                  比赛B
                </span>
                <input
                  type="text"
                  value={match2League}
                  onChange={(e) => setMatch2League(e.target.value)}
                  className="w-16 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-700"
                  placeholder="联赛"
                />
                <input
                  type="text"
                  value={match2Time}
                  onChange={(e) => setMatch2Time(e.target.value)}
                  className="flex-1 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-mono text-slate-500"
                  placeholder="比赛时间"
                />
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-slate-400 text-[11px]">主队:</span>
                <input
                  type="text"
                  value={match2Home}
                  onChange={(e) => setMatch2Home(e.target.value)}
                  className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-purple-500"
                  placeholder="主队"
                />
                <span className="text-purple-700 font-extrabold text-xs px-1">VS</span>
                <span className="text-slate-400 text-[11px]">客队:</span>
                <input
                  type="text"
                  value={match2Away}
                  onChange={(e) => setMatch2Away(e.target.value)}
                  className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-purple-500"
                  placeholder="客队"
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
            <span className="text-slate-500">串1基准:</span>
            {[5000, 10000, 20000].map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  setBaseLegStake(amt);
                  const { updatedLegs, updatedHgCovers } = solveOptimalParlayStakes(legs, hgCovers, amt);
                  setLegs(updatedLegs);
                  setHgCovers(updatedHgCovers);
                }}
                className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-colors ${
                  baseLegStake === amt
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

      {/* JC Parlays List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            竞彩串关列表 ({legs.length}个组合 · 投注选项与串单倍数均可自由修改)
          </div>
          <button
            type="button"
            onClick={() => setShowAddLegModal(true)}
            className="text-xs text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            添加 JC 串关组合
          </button>
        </div>

        {legs.map((leg) => (
          <div
            key={leg.id}
            className="bg-white rounded-2xl p-3.5 shadow-xs border border-purple-50 space-y-2 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-center gap-2">
              {/* Left Badge with EDITABLE Multiplier (串单倍数可自由修改) */}
              <div className="w-20 py-1.5 px-1.5 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 text-white text-center shrink-0 shadow-xs space-y-0.5">
                <input
                  type="text"
                  value={leg.name}
                  onChange={(e) => handleLegNameChange(leg.id, e.target.value)}
                  className="w-full text-center bg-transparent text-[11px] font-bold focus:outline-none focus:bg-white/20 rounded px-0.5"
                />
                <div className="flex items-center justify-center bg-black/20 rounded-md py-0.5 px-1">
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    value={leg.multiplier}
                    onChange={(e) => handleLegMultiplierChange(leg.id, e.target.value)}
                    className="w-12 text-center bg-transparent font-mono font-bold text-xs text-white focus:outline-none focus:bg-white/30 rounded"
                    title="串单倍数（可自由手动修改）"
                  />
                  <span className="text-[10px] text-orange-100">倍</span>
                </div>
              </div>

              {/* Match 1 Pick & Odds (投注选项可自由修改) */}
              <div className="flex-1 bg-amber-50/50 rounded-2xl p-1.5 border border-amber-100/70 text-center space-y-1">
                <div className="text-[10px] text-slate-500 font-medium truncate">
                  {match1Home}
                </div>
                <input
                  type="text"
                  value={leg.match1Pick}
                  onChange={(e) => handleLegPick1Change(leg.id, e.target.value)}
                  className="w-full text-center text-xs font-bold text-slate-900 bg-white/70 border border-amber-200/60 rounded px-1 py-0.5 focus:outline-none focus:bg-white"
                  placeholder="投注选项"
                />
                <div className="flex items-center justify-center gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => updateLegMatch1Odds(leg.id, -0.05)}
                    className="w-5 h-5 rounded-full bg-white text-slate-600 hover:text-purple-700 flex items-center justify-center shadow-xs border border-slate-200"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    value={leg.match1Odds}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setLegs((prev) =>
                        prev.map((l) =>
                          l.id === leg.id
                            ? { ...l, match1Odds: v, multiplier: Number((v * l.match2Odds).toFixed(2)) }
                            : l
                        )
                      );
                    }}
                    className="w-12 text-center font-mono font-bold text-xs text-amber-700 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateLegMatch1Odds(leg.id, 0.05)}
                    className="w-5 h-5 rounded-full bg-purple-700 text-white flex items-center justify-center shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Match 2 Pick & Odds (投注选项可自由修改) */}
              <div className="flex-1 bg-amber-50/50 rounded-2xl p-1.5 border border-amber-100/70 text-center space-y-1">
                <div className="text-[10px] text-slate-500 font-medium truncate">
                  {match2Home}
                </div>
                <input
                  type="text"
                  value={leg.match2Pick}
                  onChange={(e) => handleLegPick2Change(leg.id, e.target.value)}
                  className="w-full text-center text-xs font-bold text-slate-900 bg-white/70 border border-amber-200/60 rounded px-1 py-0.5 focus:outline-none focus:bg-white"
                  placeholder="投注选项"
                />
                <div className="flex items-center justify-center gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => updateLegMatch2Odds(-0.05)}
                    className="w-5 h-5 rounded-full bg-white text-slate-600 hover:text-purple-700 flex items-center justify-center shadow-xs border border-slate-200"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    value={leg.match2Odds}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setLegs((prev) =>
                        prev.map((l) => ({
                          ...l,
                          match2Odds: v,
                          multiplier: Number((l.match1Odds * v).toFixed(2)),
                        }))
                      );
                    }}
                    className="w-12 text-center font-mono font-bold text-xs text-amber-700 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateLegMatch2Odds(0.05)}
                    className="w-5 h-5 rounded-full bg-purple-700 text-white flex items-center justify-center shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Stake Box (Direct edit updates preview!) */}
              <div className="w-24 bg-slate-100/80 rounded-2xl p-1.5 px-2 text-right shrink-0 border border-slate-200/60">
                <div className="text-[10px] text-slate-500 font-medium">投注金额</div>
                <input
                  type="number"
                  step="1"
                  value={leg.stake}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setLegs((prev) =>
                      prev.map((l) => (l.id === leg.id ? { ...l, stake: v } : l))
                    );
                  }}
                  className="w-full text-right font-mono font-bold text-xs text-slate-800 bg-transparent focus:outline-none"
                />
              </div>

              {/* Delete JC Leg Button */}
              <button
                type="button"
                onClick={() => handleDeleteLeg(leg.id)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0"
                title={`删除 ${leg.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Individual Rebate bar */}
            <div className="flex items-center justify-between text-xs px-1 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Percent className="w-3 h-3 text-orange-500" />
                <span className="text-[11px] font-medium">{leg.name} 独立返点:</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="25"
                  value={leg.rebateRate ?? rebateConfig.jcRebateRate}
                  onChange={(e) => handleLegRebateChange(leg.id, e.target.value)}
                  className="w-14 text-center px-1 py-0.5 bg-orange-50 border border-orange-200 rounded-md font-mono text-[11px] font-bold text-orange-800 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400">%</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  (返 ¥{(((Number(leg.stake) || 0) * (Number(leg.rebateRate) || 0)) / 100).toFixed(1)})
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Crown Section */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-purple-100/80 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="bg-purple-100 text-purple-800 font-bold text-[11px] px-2 py-0.5 rounded-md">
              皇冠对冲
            </span>
            <span className="text-purple-900 font-bold text-xs">
              {match2Home} VS {match2Away}
            </span>
            <span className="text-[11px] text-slate-500">{match2Time}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAddCoverModal(true)}
            className="text-xs text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            添加皇冠对冲项
          </button>
        </div>

        {/* Crown Bet Rows (投注项目可自由修改) */}
        <div className="space-y-3 pt-1">
          {hgCovers.map((cover) => (
            <div
              key={cover.id}
              className="bg-slate-50/70 rounded-2xl p-3 border border-slate-200/60 space-y-2"
            >
              <div className="flex items-center gap-2.5">
                {/* Left Badge: Editable playType and lineTag */}
                <div className="w-20 py-1.5 px-1 rounded-xl bg-gradient-to-b from-purple-700 to-purple-800 text-white text-center shrink-0 shadow-xs space-y-0.5">
                  <input
                    type="text"
                    value={cover.playType}
                    onChange={(e) => handleCoverTypeChange(cover.id, e.target.value)}
                    className="w-full text-center bg-transparent text-[11px] font-bold focus:outline-none focus:bg-white/20 rounded px-0.5"
                    placeholder="玩法"
                  />
                  <input
                    type="text"
                    value={cover.lineTag}
                    onChange={(e) => handleCoverTagChange(cover.id, e.target.value)}
                    className="w-full text-center bg-transparent text-[10px] opacity-90 focus:outline-none focus:bg-white/20 rounded px-0.5"
                    placeholder="盘口"
                  />
                </div>

                {/* Middle selection (Editable Pick & Odds) */}
                <div className="flex-1 bg-purple-50/60 rounded-2xl p-1.5 flex items-center justify-between border border-purple-100/80">
                  <input
                    type="text"
                    value={cover.pick}
                    onChange={(e) => handleCoverPickChange(cover.id, e.target.value)}
                    className="w-14 text-center px-1 py-1 rounded-lg bg-purple-800 text-white font-bold text-xs focus:outline-none shadow-xs"
                    title="对冲方向（可自由修改，如 主 / 平 / 客 / 大）"
                  />

                  <button
                    type="button"
                    onClick={() => updateHgOdds(cover.id, -0.05)}
                    className="w-6 h-6 rounded-full bg-white text-slate-600 hover:text-purple-700 flex items-center justify-center shadow-xs border border-slate-200"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    value={cover.odds}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setHgCovers((prev) =>
                        prev.map((c) => (c.id === cover.id ? { ...c, odds: v } : c))
                      );
                    }}
                    className="w-16 text-center font-mono font-extrabold text-base text-purple-900 bg-transparent focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => updateHgOdds(cover.id, 0.05)}
                    className="w-6 h-6 rounded-full bg-purple-700 text-white hover:bg-purple-800 flex items-center justify-center shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Right Bet Amount (Manual change updates settlement!) */}
                <div className="w-28 bg-slate-100/80 rounded-2xl p-1.5 px-2 text-right shrink-0 border border-slate-200/60">
                  <div className="text-[10px] text-slate-500 font-medium">投注金额</div>
                  <input
                    type="number"
                    step="1"
                    value={cover.stake}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setHgCovers((prev) =>
                        prev.map((c) => (c.id === cover.id ? { ...c, stake: v } : c))
                      );
                    }}
                    className="w-full text-right font-mono font-bold text-sm text-slate-800 bg-transparent focus:outline-none"
                  />
                </div>

                {/* Delete Crown Cover Button */}
                <button
                  type="button"
                  onClick={() => handleDeleteCover(cover.id)}
                  className="w-8 h-8 rounded-xl bg-slate-200/60 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0"
                  title={`删除 ${cover.playType}${cover.lineTag}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Crown cover individual rebate */}
              <div className="flex items-center justify-between text-xs px-1 pt-1 border-t border-slate-200/60">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Percent className="w-3 h-3 text-purple-600" />
                  <span className="text-[11px] font-medium">{cover.playType} {cover.lineTag} 返水:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={cover.rebateRate ?? rebateConfig.hgRebateRate}
                    onChange={(e) => handleCoverRebateChange(cover.id, e.target.value)}
                    className="w-14 text-center px-1 py-0.5 bg-purple-50 border border-purple-200 rounded-md font-mono text-[11px] font-bold text-purple-900 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400">%</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    (返 ¥{(((Number(cover.stake) || 0) * (Number(cover.rebateRate) || 0)) / 100).toFixed(1)})
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 结算预览 (Settlement Preview - LIVE from manual changes!) */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-purple-100 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">结算预览</h3>
            <p className="text-xs text-slate-400">
              调整金额与独立返点后实时重新计算
            </p>
          </div>
          <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl px-4 py-2 text-center shadow-sm">
            <div className="text-[10px] font-medium text-pink-100">预计保底利润</div>
            <div className="text-base font-extrabold font-mono">
              ¥{calcResult.expectedProfit.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Dynamic Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          {legs.map((leg) => (
            <div key={leg.id} className="bg-amber-50/40 rounded-2xl p-3 border border-amber-100/60">
              <div className="text-xs text-slate-500 font-medium mb-1">{leg.name}投注</div>
              <div className="text-lg font-extrabold font-mono text-slate-900">
                {(Number(leg.stake) || 0).toFixed(2)}
              </div>
              <div className="text-[10px] text-amber-700 mt-0.5">
                {leg.multiplier.toFixed(2)}倍 (返点 {leg.rebateRate}%)
              </div>
            </div>
          ))}

          {hgCovers.map((cover) => (
            <div key={cover.id} className="bg-purple-50/40 rounded-2xl p-3 border border-purple-100/60">
              <div className="text-xs text-slate-500 font-medium mb-1">
                皇冠{cover.playType}{cover.lineTag}投注
              </div>
              <div className="text-lg font-extrabold font-mono text-slate-900">
                {(Number(cover.stake) || 0).toFixed(2)}
              </div>
              <div className="text-[10px] text-purple-700 mt-0.5">
                赔率: {cover.odds.toFixed(2)} (返水 {cover.rebateRate}%)
              </div>
            </div>
          ))}
        </div>

        {/* Summary row */}
        <div className="bg-slate-50 rounded-2xl p-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500">总投入: </span>
            <span className="font-mono font-bold text-slate-800">¥{calcResult.totalStake.toFixed(2)}</span>
            <span className="text-slate-400 mx-2">|</span>
            <span className="text-slate-500">独立返点总和: </span>
            <span className="font-mono font-bold text-emerald-600">+¥{calcResult.rebateTotal.toFixed(2)}</span>
          </div>
          <div className="font-bold text-purple-800">
            利润率: {calcResult.roiRate.toFixed(2)}%
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
              查看各赛果分支实得回报明细 ({calcResult.outcomeReturns.length} 个分支)
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
                    <th className="py-2 px-3">赛果分支</th>
                    <th className="py-2 px-3">判定明细</th>
                    <th className="py-2 px-3 text-right">总返还金额</th>
                    <th className="py-2 px-3 text-right">含返点净利润</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {calcResult.outcomeReturns.map((item, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/30">
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">
                        {item.outcome}
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-500 text-[11px]">
                        {item.description}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700 font-semibold">
                        ¥{item.returnAmount.toFixed(2)}
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

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-purple-100 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          {/* 重新计算 (Purple main button) */}
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

          {/* 存单 */}
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

      {/* Modal: Add JC Leg */}
      {showAddLegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-purple-100">
            <h3 className="text-base font-bold text-slate-900">
              添加竞彩 2串1 组合
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  串关名称
                </label>
                <input
                  type="text"
                  value={newLegName}
                  onChange={(e) => setNewLegName(e.target.value)}
                  placeholder="如: JC串3"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  比赛A ({match1Home} VS {match1Away}) 选项与赔率
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newLegPick1}
                    onChange={(e) => setNewLegPick1(e.target.value)}
                    placeholder="投注选项"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={newLegOdds1}
                    onChange={(e) => setNewLegOdds1(e.target.value)}
                    placeholder="赔率"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  比赛B ({match2Home} VS {match2Away}) 选项与赔率
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newLegPick2}
                    onChange={(e) => setNewLegPick2(e.target.value)}
                    placeholder="投注选项"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={newLegOdds2}
                    onChange={(e) => setNewLegOdds2(e.target.value)}
                    placeholder="赔率"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  自定义串单倍数 (可选，留空按赔率乘积自动计算)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newLegCustomMultiplier}
                  onChange={(e) => setNewLegCustomMultiplier(e.target.value)}
                  placeholder={`默认: ${(parseFloat(newLegOdds1 || '2') * parseFloat(newLegOdds2 || '2')).toFixed(2)}倍`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  该串关独立返点 (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newLegRebate}
                  onChange={(e) => setNewLegRebate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddLegModal(false)}
                className="flex-1 py-2.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-xl"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddLeg}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-orange-600 rounded-xl hover:bg-orange-700"
              >
                确认添加串关
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Crown Cover */}
      {showAddCoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-purple-100">
            <h3 className="text-base font-bold text-slate-900">
              添加皇冠对冲选项
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  玩法类型与盘口标识
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newCoverType}
                    onChange={(e) => setNewCoverType(e.target.value)}
                    placeholder="如: 让球 / 胜平负"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                  <input
                    type="text"
                    value={newCoverTag}
                    onChange={(e) => setNewCoverTag(e.target.value)}
                    placeholder="如: -0.25 / 平局 / 主胜"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  投注方向 (Pick) 与 赔率
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newCoverPick}
                    onChange={(e) => setNewCoverPick(e.target.value)}
                    placeholder="如: 主 / 平 / 客"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={newCoverOdds}
                    onChange={(e) => setNewCoverOdds(e.target.value)}
                    placeholder="赔率"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  该项独立返水 (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newCoverRebate}
                  onChange={(e) => setNewCoverRebate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCoverModal(false)}
                className="flex-1 py-2.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-xl"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddCover}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-purple-700 rounded-xl hover:bg-purple-800"
              >
                确认添加对冲项
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
