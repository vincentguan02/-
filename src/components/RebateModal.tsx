import React, { useState } from 'react';
import { X, Percent, Check, HelpCircle, RotateCcw } from 'lucide-react';
import { RebateConfig } from '../types';
import { DEFAULT_REBATE } from '../utils/storage';

interface RebateModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: RebateConfig;
  onSave: (config: RebateConfig) => void;
}

export const RebateModal: React.FC<RebateModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [jcRate, setJcRate] = useState<number>(config.jcRebateRate);
  const [hgRate, setHgRate] = useState<number>(config.hgRebateRate);
  const [roiBase, setRoiBase] = useState<'jc' | 'total'>(config.roiBase);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      jcRebateRate: Number(jcRate) || 0,
      hgRebateRate: Number(hgRate) || 0,
      roiBase,
    });
    onClose();
  };

  const handleReset = () => {
    setJcRate(DEFAULT_REBATE.jcRebateRate);
    setHgRate(DEFAULT_REBATE.hgRebateRate);
    setRoiBase(DEFAULT_REBATE.roiBase);
  };

  const jcPresets = [0, 5.0, 6.0, 7.0, 8.0, 10.0];
  const hgPresets = [0, 0.5, 0.8, 1.0, 1.2, 1.5];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-purple-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-800 to-purple-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Percent className="w-4 h-4 text-purple-100" />
            </div>
            <div>
              <h3 className="text-base font-bold">返点与费率设置</h3>
              <p className="text-xs text-purple-200">自定义竞彩与皇冠返点比例</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* JC Rebate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                竞彩返点比例 (%)
              </label>
              <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-semibold">
                当前: {jcRate}%
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                max="25"
                value={jcRate}
                onChange={(e) => setJcRate(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
                placeholder="例如 7.0"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                %
              </span>
            </div>
            {/* Quick buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {jcPresets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setJcRate(val)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                    jcRate === val
                      ? 'bg-orange-500 text-white font-semibold shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {val}%
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              * 彩票店出票返点（多数彩店为 5.0% ~ 8.0%）。计算器内每个投注选项亦支持单独微调。
            </p>
          </div>

          {/* Crown Rebate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-700"></span>
                皇冠水钱返点 (%)
              </label>
              <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-semibold">
                当前: {hgRate}%
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                min="0"
                max="10"
                value={hgRate}
                onChange={(e) => setHgRate(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
                placeholder="例如 0.8"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                %
              </span>
            </div>
            {/* Quick buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {hgPresets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setHgRate(val)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                    hgRate === val
                      ? 'bg-purple-700 text-white font-semibold shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {val}%
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              * 皇冠等外围平台代理洗码返水（通常 0.5% ~ 1.2%）
            </p>
          </div>

          {/* ROI Calculation Base */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800">
              利润率计算基准
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRoiBase('jc')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  roiBase === 'jc'
                    ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">按竞彩投注金额</span>
                  {roiBase === 'jc' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                </div>
                <div className="text-[11px] text-slate-500 leading-tight">
                  利润 ÷ 竞彩金额 (图示标准)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRoiBase('total')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  roiBase === 'total'
                    ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">按总投入金额</span>
                  {roiBase === 'total' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                </div>
                <div className="text-[11px] text-slate-500 leading-tight">
                  利润 ÷ (竞彩+皇冠总额)
                </div>
              </button>
            </div>
          </div>

          {/* Help Toggle */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <button
              type="button"
              onClick={() => setShowExplanation(!showExplanation)}
              className="flex items-center justify-between w-full text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                对冲套利返点机制说明
              </span>
              <span className="text-purple-600">{showExplanation ? '收起' : '展开'}</span>
            </button>
            {showExplanation && (
              <div className="mt-2.5 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
                <p>
                  <strong>1. 返点如何产生利润？</strong> 对冲全包策略保证在赛果任意出项下本金基本保本或微利，加上彩店与皇冠平台各自给予的返点流水（如竞彩 7% + 皇冠 0.8%），锁定稳固净利润。
                </p>
                <p>
                  <strong>2. 走水（Push）处理：</strong> 皇冠大小球 2.00 遇刚好 2 个进球时，外围退还本金，竞彩 2 球命中中奖，系统自动计入双重返还。
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors py-2 px-3 rounded-lg hover:bg-slate-200/60"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            恢复默认
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-800 hover:to-purple-900 rounded-xl shadow-md shadow-purple-900/10 active:scale-95 transition-all"
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
