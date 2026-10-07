import React, { useState } from 'react';
import {
  TrendingUp,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  Trash2,
  Download,
  Upload,
  Copy,
  Check,
  ChevronRight,
  Filter,
  BarChart2,
  PieChart,
} from 'lucide-react';
import { BetRecord } from '../types';

interface HistoryAndAnalyticsProps {
  history: BetRecord[];
  onUpdateHistory: (records: BetRecord[]) => void;
  onClearHistory: () => void;
}

export const HistoryAndAnalytics: React.FC<HistoryAndAnalyticsProps> = ({
  history,
  onUpdateHistory,
  onClearHistory,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'goals' | 'parlay' | 'single'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'settled'>('all');
  const [selectedRecordForSettle, setSelectedRecordForSettle] = useState<BetRecord | null>(null);
  const [settleActualProfit, setSettleActualProfit] = useState<string>('');
  const [settleNote, setSettleNote] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtered records
  const filteredRecords = history.filter((rec) => {
    if (filterMode !== 'all' && rec.mode !== filterMode) return false;
    if (filterStatus !== 'all' && rec.status !== filterStatus) return false;
    return true;
  });

  // Calculate Metrics
  const totalVolume = history.reduce((sum, r) => sum + r.totalStake, 0);
  const totalExpectedProfit = history.reduce((sum, r) => sum + r.expectedProfit, 0);
  const settledRecords = history.filter((r) => r.status === 'settled');
  const actualProfitTotal = settledRecords.reduce(
    (sum, r) => sum + (r.settledProfit !== undefined ? r.settledProfit : r.expectedProfit),
    0
  );
  const pendingCount = history.filter((r) => r.status === 'pending').length;
  const avgRoi =
    history.length > 0
      ? history.reduce((sum, r) => sum + r.roiRate, 0) / history.length
      : 0;

  // Cumulative profit points for SVG chart
  const sortedByTime = [...history].sort((a, b) => a.timestamp - b.timestamp);
  let runningProfit = 0;
  const chartPoints = sortedByTime.map((r, index) => {
    const profit = r.status === 'settled' && r.settledProfit !== undefined ? r.settledProfit : r.expectedProfit;
    runningProfit += profit;
    return {
      index,
      title: r.title,
      date: r.createdAtStr.split(' ')[0],
      profit,
      cumulative: Number(runningProfit.toFixed(2)),
    };
  });

  // SVG Chart Dimensions
  const chartWidth = 560;
  const chartHeight = 180;
  const padding = { top: 20, right: 25, bottom: 30, left: 45 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  let minCum = Math.min(0, ...chartPoints.map((p) => p.cumulative));
  let maxCum = Math.max(100, ...chartPoints.map((p) => p.cumulative));
  if (minCum === maxCum) {
    maxCum += 100;
  }
  const cumRange = maxCum - minCum || 1;

  const getX = (idx: number) => {
    if (chartPoints.length <= 1) return padding.left + innerW / 2;
    return padding.left + (idx / (chartPoints.length - 1)) * innerW;
  };

  const getY = (val: number) => {
    return padding.top + innerH - ((val - minCum) / cumRange) * innerH;
  };

  const linePathD = chartPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.cumulative)}`)
    .join(' ');

  const areaPathD =
    chartPoints.length > 0
      ? `${linePathD} L ${getX(chartPoints.length - 1)} ${padding.top + innerH} L ${getX(0)} ${
          padding.top + innerH
        } Z`
      : '';

  // Delete Record
  const handleDelete = (id: string) => {
    if (confirm('确定删除该条注单记录吗？')) {
      onUpdateHistory(history.filter((h) => h.id !== id));
    }
  };

  // Settle Record
  const handleOpenSettle = (rec: BetRecord) => {
    setSelectedRecordForSettle(rec);
    setSettleActualProfit(rec.expectedProfit.toString());
    setSettleNote(rec.settledResult || '赛果符合对冲预期，已全额派奖');
  };

  const handleConfirmSettle = () => {
    if (!selectedRecordForSettle) return;
    const profitNum = parseFloat(settleActualProfit) || 0;
    const updated = history.map((h) => {
      if (h.id === selectedRecordForSettle.id) {
        return {
          ...h,
          status: 'settled' as const,
          settledProfit: profitNum,
          settledResult: settleNote,
        };
      }
      return h;
    });
    onUpdateHistory(updated);
    setSelectedRecordForSettle(null);
  };

  // Export JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `bet_records_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  };

  // Import JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onUpdateHistory(parsed);
          alert('成功导入 ' + parsed.length + ' 条历史注单！');
        }
      } catch (err) {
        alert('文件格式错误，请导入有效的历史记录 JSON 文件');
      }
    };
    reader.readAsText(file);
  };

  // Copy details
  const handleCopyRecord = (rec: BetRecord) => {
    const text = [
      `【注单记录】${rec.title}`,
      `时间: ${rec.createdAtStr}`,
      `竞彩投入: ¥${rec.jcStake} | 皇冠投入: ¥${rec.hgStake} | 总投注: ¥${rec.totalStake}`,
      `预计利润: ¥${rec.expectedProfit} (利润率 ${rec.roiRate}%)`,
      `明细: ${rec.details.itemsSummary}`,
      rec.settledResult ? `结算结果: ${rec.settledResult}` : `状态: 待结算`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopiedId(rec.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5 max-w-xl mx-auto pb-24">
      {/* Metrics Summary Header */}
      <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <h2 className="text-base font-bold">盈亏与对冲分析看板</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                title="导出记录"
              >
                <Download className="w-3.5 h-3.5" />
                导出
              </button>
              <label
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                title="导入记录"
              >
                <Upload className="w-3.5 h-3.5" />
                导入
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Key Stat Cards Grid */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <div className="text-[11px] text-purple-200 mb-0.5">累计实现净利润</div>
              <div className="text-2xl font-extrabold font-mono text-emerald-300">
                +¥{actualProfitTotal.toFixed(2)}
              </div>
              <div className="text-[10px] text-purple-200 mt-1">
                全部预计利润: ¥{totalExpectedProfit.toFixed(2)}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <div className="text-[11px] text-purple-200 mb-0.5">累计投注总流水</div>
              <div className="text-2xl font-extrabold font-mono text-white">
                ¥{totalVolume.toFixed(2)}
              </div>
              <div className="text-[10px] text-purple-200 mt-1">
                单均回报率: {avgRoi.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Secondary stats bar */}
          <div className="flex items-center justify-between text-xs text-purple-200 pt-1 border-t border-white/10">
            <div>
              总单数: <span className="font-mono font-bold text-white">{history.length}</span> 单
            </div>
            <div>
              待结算: <span className="font-mono font-bold text-amber-300">{pendingCount}</span> 单
            </div>
            <div>
              已结清: <span className="font-mono font-bold text-emerald-300">{settledRecords.length}</span> 单
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Chart: Cumulative Profit SVG */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-purple-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-700" />
            <h3 className="text-sm font-bold text-slate-800">累计盈利增长趋势图</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {chartPoints.length} 个历史注单节点
          </span>
        </div>

        {/* SVG Curve Chart */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[480px]">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto"
            >
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9333ea" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#9333ea" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line
                x1={padding.left}
                y1={padding.top + innerH}
                x2={padding.left + innerW}
                y2={padding.top + innerH}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <line
                x1={padding.left}
                y1={getY(0)}
                x2={padding.left + innerW}
                y2={getY(0)}
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeDasharray="4 4"
              />

              {/* Y Axis labels */}
              <text
                x={padding.left - 8}
                y={getY(maxCum) + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono"
              >
                ¥{Math.round(maxCum)}
              </text>
              <text
                x={padding.left - 8}
                y={getY(0) + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono"
              >
                ¥0
              </text>

              {/* Area */}
              {chartPoints.length > 0 && (
                <path d={areaPathD} fill="url(#profitGrad)" />
              )}

              {/* Line */}
              {chartPoints.length > 0 && (
                <path
                  d={linePathD}
                  fill="none"
                  stroke="#7e22ce"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points */}
              {chartPoints.map((p, idx) => (
                <g key={idx} className="group cursor-pointer">
                  <circle
                    cx={getX(idx)}
                    cy={getY(p.cumulative)}
                    r="4"
                    fill="#ffffff"
                    stroke="#7e22ce"
                    strokeWidth="2"
                    className="hover:r-6 transition-all"
                  />
                  {/* Tooltip on top */}
                  <text
                    x={getX(idx)}
                    y={getY(p.cumulative) - 8}
                    textAnchor="middle"
                    className="text-[9px] fill-purple-900 font-mono font-bold opacity-80"
                  >
                    +¥{p.profit}
                  </text>
                  <text
                    x={getX(idx)}
                    y={padding.top + innerH + 16}
                    textAnchor="middle"
                    className="text-[9px] fill-slate-400 font-mono"
                  >
                    {p.date.slice(5)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
              filterMode === 'all'
                ? 'bg-white text-purple-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            全部玩法
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('goals')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
              filterMode === 'goals'
                ? 'bg-white text-purple-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            进球数
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('parlay')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
              filterMode === 'parlay'
                ? 'bg-white text-purple-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            全包串关
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('single')}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
              filterMode === 'single'
                ? 'bg-white text-purple-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            单关
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">所有状态</option>
            <option value="pending">待结算</option>
            <option value="settled">已结算</option>
          </select>

          {history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm('确定清空所有历史注单吗？')) onClearHistory();
              }}
              className="text-xs text-rose-600 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
              title="清空记录"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-700">暂无符合条件的注单记录</div>
            <p className="text-xs text-slate-400">
              在上方计算器中调整赔率后，点击底部的“存单”按钮即可保存到此处
            </p>
          </div>
        ) : (
          filteredRecords.map((rec) => {
            const isSettled = rec.status === 'settled';
            return (
              <div
                key={rec.id}
                className="bg-white rounded-2xl p-4 shadow-xs border border-purple-50 hover:shadow-md transition-shadow space-y-3"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          rec.mode === 'goals'
                            ? 'bg-orange-100 text-orange-800'
                            : rec.mode === 'parlay'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {rec.mode === 'goals'
                          ? '进球数对冲'
                          : rec.mode === 'parlay'
                          ? '全包串关'
                          : '单关对冲'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {rec.createdAtStr}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {rec.title}
                    </h4>
                    <div className="text-xs text-slate-500">{rec.matchInfo}</div>
                  </div>

                  {/* Status & Expected Profit */}
                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-slate-400">预期收益</div>
                    <div className="text-base font-extrabold font-mono text-purple-700">
                      +¥{rec.expectedProfit.toFixed(2)}
                    </div>
                    <div className="text-[10px] font-mono font-semibold text-emerald-600">
                      +{rec.roiRate.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Stakes Breakdown Bar */}
                <div className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-slate-400">竞彩: </span>
                    <span className="font-bold text-slate-800">¥{rec.jcStake}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">皇冠: </span>
                    <span className="font-bold text-slate-800">¥{rec.hgStake}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">总计: </span>
                    <span className="font-bold text-purple-900">¥{rec.totalStake}</span>
                  </div>
                </div>

                {/* Details summary */}
                <div className="text-[11px] text-slate-600 leading-relaxed bg-amber-50/40 p-2 rounded-lg border border-amber-100/50">
                  <span className="text-slate-400">投注内容: </span>
                  {rec.details.itemsSummary}
                </div>

                {/* Settlement status block */}
                {isSettled ? (
                  <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold">已结算：</span>
                        <span>{rec.settledResult}</span>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-emerald-700 shrink-0 ml-2">
                      实得 +¥{(rec.settledProfit !== undefined ? rec.settledProfit : rec.expectedProfit).toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-amber-800">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>赛事进行中 / 等待赛果出来后结算</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenSettle(rec)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      录入赛果结算
                    </button>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleCopyRecord(rec)}
                    className="text-xs text-slate-500 hover:text-purple-700 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-purple-50"
                  >
                    {copiedId === rec.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        复制单据
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(rec.id)}
                    className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    删除
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Settle Modal */}
      {selectedRecordForSettle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">
              录入赛果结算注单
            </h3>
            <p className="text-xs text-slate-500">
              {selectedRecordForSettle.title}
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                最终净收益 (元)
              </label>
              <input
                type="number"
                step="0.01"
                value={settleActualProfit}
                onChange={(e) => setSettleActualProfit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-800"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                赛果说明 (例如比分或出项)
              </label>
              <input
                type="text"
                value={settleNote}
                onChange={(e) => setSettleNote(e.target.value)}
                placeholder="如: 比分 2-0, 皇冠走水, 竞彩2球中"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRecordForSettle(null)}
                className="flex-1 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-xl"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmSettle}
                className="flex-1 py-2 text-xs font-semibold text-white bg-purple-700 rounded-xl"
              >
                确认结算
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
