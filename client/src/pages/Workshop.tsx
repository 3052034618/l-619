import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import {
  Hammer,
  Plus,
  X,
  Sparkles,
  Clock,
  Gauge,
  Star,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QUALITY_COLORS, QUALITY_LABELS, ERA_LABELS, formatNumber, calculateMasteryLevel, cn } from '../utils';

interface Fragment {
  id: string;
  name: string;
  quality: string;
  era: string;
  slotPosition: number;
  temporalEnergy: number;
  attributes: Record<string, number>;
  isListed: boolean;
}

export default function Workshop() {
  const { player, fetchMe } = useAuthStore();
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [slots, setSlots] = useState<(Fragment | null)[]>([null, null, null, null]);
  const [selectedFragment, setSelectedFragment] = useState<Fragment | null>(null);
  const [isCrafting, setIsCrafting] = useState(false);
  const [craftResult, setCraftResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    loadFragments();
  }, []);

  const loadFragments = async () => {
    try {
      const res = await api.get('/players/me/inventory');
      if (res.data?.success) {
        setFragments(res.data.data.fragments || []);
      }
    } catch {
      setFragments([]);
    }
  };

  const availableFragments = fragments.filter(
    (f) => !f.isListed && !slots.find((s) => s?.id === f.id)
  );

  const addToSlot = (fragment: Fragment, slotIndex?: number) => {
    const targetSlot = slotIndex !== undefined ? slotIndex : slots.findIndex((s) => s === null);
    if (targetSlot === -1) return;
    const newSlots = [...slots];
    newSlots[targetSlot] = fragment;
    setSlots(newSlots);
    setSelectedFragment(null);
  };

  const removeFromSlot = (slotIndex: number) => {
    const newSlots = [...slots];
    newSlots[slotIndex] = null;
    setSlots(newSlots);
  };

  const getCraftPreview = () => {
    const usedFragments = slots.filter((s) => s !== null) as Fragment[];
    if (usedFragments.length < 2) return null;

    const totalEnergy = usedFragments.reduce((sum, f) => sum + f.temporalEnergy, 0);
    const qualityMul: Record<string, number> = { common: 100, uncommon: 150, rare: 250, epic: 400, legendary: 700, mythical: 1200 };
    const qualityScore = usedFragments.reduce((sum, f) => sum + (qualityMul[f.quality] || 0), 0);
    const masteryBonus = calculateMasteryLevel(player?.craftMastery || 0) * 20;
    const finalScore = totalEnergy + qualityScore + masteryBonus;

    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];
    let estimatedRarity = 'common';
    if (finalScore >= 5000) estimatedRarity = 'mythical';
    else if (finalScore >= 3000) estimatedRarity = 'legendary';
    else if (finalScore >= 1500) estimatedRarity = 'epic';
    else if (finalScore >= 700) estimatedRarity = 'rare';
    else if (finalScore >= 300) estimatedRarity = 'uncommon';

    const avgQuality = usedFragments.reduce((sum, f) => sum + rarities.indexOf(f.quality), 0) / usedFragments.length;
    const successRate = Math.min(
      95,
      50 + avgQuality * 8 + calculateMasteryLevel(player?.craftMastery || 0) * 3 + (usedFragments.length === 4 ? 5 : 0)
    );

    return {
      estimatedRarity,
      estimatedPower: finalScore,
      successRate,
      cost: usedFragments.length * (usedFragments.length + 1) * 50,
    };
  };

  const handleCraft = async () => {
    const usedFragments = slots.filter((s) => s !== null);
    if (usedFragments.length < 2) return;

    setIsCrafting(true);
    try {
      const recipe = {
        slot1: slots[0]?.id || null,
        slot2: slots[1]?.id || null,
        slot3: slots[2]?.id || null,
        slot4: slots[3]?.id || null,
      };
      const res = await api.post('/crafting/craft', { recipe });
      if (res.data?.success) {
        setCraftResult(res.data.data);
        setShowResult(true);
        setSlots([null, null, null, null]);
        await Promise.all([loadFragments(), fetchMe()]);
      } else {
        alert(res.data?.error || '合成失败');
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '合成失败');
    } finally {
      setIsCrafting(false);
    }
  };

  const preview = getCraftPreview();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Hammer className="w-7 h-7 text-time-400" />
            时光工坊
          </h2>
          <p className="text-gray-400 mt-1">
            工匠等级: Lv.{calculateMasteryLevel(player?.craftMastery || 0)} · 熟练度:{' '}
            {formatNumber(player?.craftMastery || 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-bold mb-4">合成台</h3>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {slots.map((slot, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: slot ? 1.02 : 1.05 }}
                  onClick={() => (slot ? removeFromSlot(i) : setSelectedFragment({} as Fragment))}
                  className={cn(
                    'relative aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all',
                    slot
                      ? `border-solid quality-bg-${slot.quality} quality-${slot.quality}`
                      : 'border-gray-600 hover:border-time-500 bg-dark-700'
                  )}
                >
                  {slot ? (
                    <>
                      <div className="text-center p-2">
                        <p className="text-xs font-semibold truncate">{slot.name}</p>
                        <p className={`text-xs quality-${slot.quality}`}>{QUALITY_LABELS[slot.quality]}</p>
                        <p className="text-xs text-gray-400">{ERA_LABELS[slot.era]}</p>
                        <p className="text-xs text-time-400 mt-1">⚡ {slot.temporalEnergy}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromSlot(i);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 flex items-center justify-center hover:bg-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Plus className="w-8 h-8 text-gray-500" />
                      <p className="text-xs text-gray-500 mt-1">槽位 {i + 1}</p>
                    </>
                  )}
                </motion.div>
              ))}
            </div>

            {preview && (
              <div className="bg-dark-700 rounded-lg p-4 mb-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  合成预览
                </h4>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-gray-400 text-xs">预计品质</p>
                    <p
                      className={`font-bold text-lg quality-${preview.estimatedRarity}`}
                      style={{ color: QUALITY_COLORS[preview.estimatedRarity] }}
                    >
                      {QUALITY_LABELS[preview.estimatedRarity]}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">时光掌控力</p>
                    <p className="font-bold text-lg text-time-300">{preview.estimatedPower}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">成功率</p>
                    <p className="font-bold text-lg text-green-400">{preview.successRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">费用</p>
                    <p className="font-bold text-lg text-yellow-400">{preview.cost}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleCraft}
              disabled={isCrafting || (slots.filter((s) => s).length < 2)}
              className="btn-primary w-full py-3 text-lg flex items-center justify-center gap-2"
            >
              {isCrafting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <Hammer className="w-5 h-5" />
              )}
              {isCrafting ? '合成中...' : '开始合成'}
            </button>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold mb-4">我的碎片 ({availableFragments.length})</h3>
            {availableFragments.length === 0 ? (
              <p className="text-gray-400 text-center py-8">暂无可用碎片，去副本收集吧！</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {availableFragments.map((fragment) => (
                  <motion.div
                    key={fragment.id}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addToSlot(fragment)}
                    className={cn(
                      'p-3 rounded-lg cursor-pointer border quality-bg-' + fragment.quality,
                      'quality-' + fragment.quality
                    )}
                  >
                    <p className="font-semibold text-sm truncate">{fragment.name}</p>
                    <p className={`text-xs quality-${fragment.quality}`}>{QUALITY_LABELS[fragment.quality]} · {ERA_LABELS[fragment.era]}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-time-400 flex items-center gap-1">
                        <Gauge className="w-3 h-3" /> {fragment.temporalEnergy}
                      </span>
                      <span className="text-xs text-gray-400">槽位 {fragment.slotPosition}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              合成提示
            </h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-time-400">•</span>
                <span>至少需要2个碎片才能合成沙漏</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-time-400">•</span>
                <span>碎片品质越高，合成出的沙漏品质越好</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-time-400">•</span>
                <span>4个同年代碎片可获得额外加成</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-time-400">•</span>
                <span>工匠熟练度越高，成功率和品质越高</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-time-400">•</span>
                <span>高品质沙漏有概率获得稀有词缀</span>
              </li>
            </ul>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-time-400" />
              词缀说明
            </h3>
            <div className="space-y-2 text-sm">
              {[
                { name: '时间停滞', desc: '冻结目标3秒' },
                { name: '加速流逝', desc: '攻速移速+50%' },
                { name: '时光回溯', desc: '回溯5秒前状态' },
                { name: '时间膨胀', desc: '扩大时间场范围' },
                { name: '时光护盾', desc: '生成伤害护盾' },
                { name: '时空爆发', desc: 'AOE时空伤害' },
                { name: '时间悖论', desc: '复制自身幻象' },
                { name: '永恒之境', desc: '无敌5秒' },
              ].map((affix) => (
                <div key={affix.name} className="bg-dark-700 rounded p-2">
                  <p className="font-semibold text-time-300">{affix.name}</p>
                  <p className="text-gray-400 text-xs">{affix.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showResult && craftResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowResult(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`card max-w-md w-full text-center quality-bg-${craftResult.rarity || 'common'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {craftResult.success ? (
                <>
                  <h3 className="text-2xl font-bold text-green-400 mb-4">🎉 合成成功！</h3>
                  <div
                    className={`text-3xl font-bold mb-2 quality-${craftResult.rarity}`}
                    style={{ color: QUALITY_COLORS[craftResult.rarity] }}
                  >
                    {craftResult.sandglassName}
                  </div>
                  <p className={`quality-${craftResult.rarity} mb-4`} style={{ color: QUALITY_COLORS[craftResult.rarity] }}>
                    {QUALITY_LABELS[craftResult.rarity]}
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-400">时光掌控力</p>
                      <p className="text-xl font-bold text-time-300">{craftResult.temporalControl}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">特殊效果</p>
                      <p className="text-xl font-bold text-purple-300">
                        {(craftResult.specialEffectChance * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  {craftResult.affixes?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-gray-400 text-sm mb-2">获得词缀:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {craftResult.affixes.map((a: any, i: number) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-dark-600 rounded-full text-sm text-time-300"
                          >
                            {a.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-gray-400">
                    熟练度 +{craftResult.masteryGain}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-red-400 mb-4">💔 合成失败</h3>
                  <p className="text-gray-300 mb-4">{craftResult.message}</p>
                  <p className="text-sm text-gray-400">
                    熟练度 +{craftResult.masteryGain}
                  </p>
                </>
              )}
              <button onClick={() => setShowResult(false)} className="btn-primary mt-6">
                确定
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
