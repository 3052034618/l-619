import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import {
  Swords,
  Clock,
  Shield,
  Zap,
  Trophy,
  Target,
  Timer,
  Users,
  Crown,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber, cn, QUALITY_COLORS, QUALITY_LABELS } from '../utils';

interface Sandglass {
  id: string;
  name: string;
  rarity: string;
  temporalControl: number;
  specialEffectChance: number;
  remainingUses: number;
  maxUses: number;
  affixes: any[];
  isFavorite: boolean;
  isLocked: boolean;
  isListed: boolean;
}

export default function League() {
  const { player, fetchMe } = useAuthStore();
  const { matchState, joinMatch, leaveMatch } = useSocketStore();
  const [sandglasses, setSandglasses] = useState<Sandglass[]>([]);
  const [selectedSandglass, setSelectedSandglass] = useState<string | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'battle' | 'ranking' | 'history'>('battle');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (matchState) {
      joinMatch(matchState.matchId);
    }
  }, [matchState]);

  const loadData = async () => {
    try {
      const [rankRes, historyRes, invRes] = await Promise.all([
        api.get('/league/leaderboard?pageSize=10'),
        api.get('/league/history?pageSize=20'),
        api.get('/players/me/inventory'),
      ]);
      setLeaderboard(rankRes.data?.data?.items || []);
      setMatchHistory(historyRes.data?.data?.items || []);
      const allSgs = invRes.data?.data?.sandglasses || [];
      setSandglasses(allSgs.filter((s: Sandglass) => s.remainingUses > 0));
    } catch {
      setSandglasses([]);
    }
  };

  const joinQueue = async () => {
    if (!selectedSandglass) {
      alert('请先选择一个沙漏');
      return;
    }
    try {
      setIsMatching(true);
      await api.post('/league/queue/join', { sandglassId: selectedSandglass });
    } catch (error: any) {
      alert(error.response?.data?.error || '加入队列失败');
      setIsMatching(false);
    }
  };

  const leaveQueue = async () => {
    try {
      await api.post('/league/queue/leave');
      setIsMatching(false);
    } catch {}
  };

  const useSkill = async (skillId: string) => {
    if (!matchState) return;
    try {
      await api.post(`/league/match/${matchState.matchId}/skill`, { skillId });
    } catch {}
  };

  const useCounter = async () => {
    if (!matchState) return;
    try {
      await api.post(`/league/match/${matchState.matchId}/counter`);
    } catch {}
  };

  if (matchState) {
    const p1 = matchState.player1;
    const p2 = matchState.player2;
    const isPlayer1 = player?.id === p1.id;
    const me = isPlayer1 ? p1 : p2;
    const opponent = isPlayer1 ? p2 : p1;
    const elapsed = matchState.elapsed || 0;

    return (
      <div className="h-full -m-6 flex flex-col bg-gradient-to-b from-dark-900 via-time-900/20 to-dark-900">
        <div className="p-4 bg-dark-800/90 backdrop-blur-sm border-b border-time-500/20">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="text-center">
              <p className="text-sm text-gray-400">对战时间</p>
              <p className="text-2xl font-mono font-bold text-time-300">
                {Math.floor(elapsed / 60000).toString().padStart(2, '0')}:
                {Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0')}
              </p>
            </div>
            <button onClick={useCounter} className="btn-secondary">
              <Shield className="w-5 h-5 mr-2 inline" />
              时空反制 (20s)
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-4xl grid grid-cols-2 gap-8">
            {[me, opponent].map((p, idx) => {
              const isMe = idx === 0;
              const hpPercent = (p.hp / p.maxHp) * 100;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: isMe ? -50 : 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'card text-center',
                    isMe ? 'ring-2 ring-time-500' : 'ring-2 ring-red-500/50'
                  )}
                >
                  <div className="mb-4">
                    <p className="text-xl font-bold">{p.name}</p>
                    <p className="text-sm text-gray-400">Lv.{p.level}</p>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">HP</span>
                      <span className={cn(isMe ? 'text-green-400' : 'text-red-400')}>
                        {p.hp} / {p.maxHp}
                      </span>
                    </div>
                    <div className="w-full h-4 bg-dark-600 rounded-full overflow-hidden">
                      <motion.div
                        className={cn('h-full', isMe ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-orange-400')}
                        animate={{ width: `${hpPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="bg-dark-700 rounded p-2">
                      <p className="text-gray-400 text-xs">剩余时间</p>
                      <p className="font-bold text-time-300">{p.remainingTime.toFixed(0)}s</p>
                    </div>
                    <div className="bg-dark-700 rounded p-2">
                      <p className="text-gray-400 text-xs">时间场</p>
                      <p className="font-bold text-purple-300">{p.timeFieldCoverage}%</p>
                    </div>
                    <div className="bg-dark-700 rounded p-2 col-span-2">
                      <p className="text-gray-400 text-xs">
                        {p.sandglassName} · {QUALITY_LABELS[p.sandglassRarity]}
                      </p>
                      <p className="font-bold text-sand-300">⚡ {p.temporalControl}</p>
                    </div>
                  </div>

                  {isMe && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400 mb-2">技能</p>
                      {p.skills.map((skill: any) => (
                        <button
                          key={skill.id}
                          onClick={() => skill.ready && useSkill(skill.id)}
                          disabled={!skill.ready}
                          className={cn(
                            'w-full py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-between',
                            skill.ready
                              ? 'bg-gradient-to-r from-time-600 to-time-500 hover:from-time-500 hover:to-time-400'
                              : 'bg-dark-600 text-gray-500 cursor-not-allowed'
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            {skill.name}
                          </span>
                          {!skill.ready && (
                            <span className="text-xs">{skill.cooldown.toFixed(0)}s</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Swords className="w-7 h-7 text-red-400" />
            时光联赛
          </h2>
          <p className="text-gray-400 mt-1">使用沙漏进行时空对决，赢取积分和稀有碎片</p>
        </div>
        <div className="card py-3 px-5">
          <p className="text-sm text-gray-400">我的积分</p>
          <p className="text-2xl font-bold text-time-300">{formatNumber(player?.leaguePoints || 0)}</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        {(['battle', 'ranking', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-6 py-2 rounded-lg font-medium transition-all',
              activeTab === tab
                ? 'bg-time-600 text-white'
                : 'bg-dark-700 text-gray-400 hover:text-white'
            )}
          >
            {tab === 'battle' && '⚔️ 对战'}
            {tab === 'ranking' && '🏆 排行榜'}
            {tab === 'history' && '📜 历史记录'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'battle' && (
          <motion.div
            key="battle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="card">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-time-400" />
                选择出战沙漏
              </h3>
              {sandglasses.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  暂无沙漏，请先去工坊合成
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {sandglasses.map((s) => {
                    const isDisabled = s.remainingUses <= 0 || s.isLocked || s.isListed;
                    const disabledReason = s.isLocked ? '已锁定' : s.isListed ? '已上架' : s.remainingUses <= 0 ? '次数耗尽' : '';
                    return (
                    <div
                      key={s.id}
                      onClick={() => !isDisabled && setSelectedSandglass(s.id)}
                      className={cn(
                        'p-4 rounded-lg transition-all border-2',
                        selectedSandglass === s.id
                          ? 'border-time-500 bg-time-500/10 cursor-pointer'
                          : isDisabled
                          ? 'border-transparent bg-dark-700/50 opacity-60 cursor-not-allowed'
                          : 'border-transparent bg-dark-700 hover:bg-dark-600 cursor-pointer'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold" style={{ color: QUALITY_COLORS[s.rarity] }}>
                            {s.name}
                            {s.isFavorite && <span className="ml-1 text-yellow-400">★</span>}
                          </p>
                          <p className="text-xs text-gray-400">
                            {QUALITY_LABELS[s.rarity]} · ⚡ {s.temporalControl}
                          </p>
                          {isDisabled && (
                            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                              {s.isLocked && <Lock className="w-3 h-3" />}
                              {disabledReason}
                              {s.isLocked && '，请在工坊解锁'}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">使用次数</p>
                          <p className="font-bold">
                            {s.remainingUses}/{s.maxUses}
                          </p>
                        </div>
                      </div>
                    </div>
                  );})}
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Timer className="w-5 h-5 text-yellow-400" />
                匹配对战
              </h3>

              <div className="text-center py-8">
                {isMatching ? (
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-time-500 to-red-500 flex items-center justify-center animate-glow">
                      <Users className="w-12 h-12 text-white" />
                    </div>
                    <p className="text-xl font-bold mb-2">匹配中...</p>
                    <p className="text-gray-400 text-sm mb-6">正在寻找合适的对手</p>
                    <button onClick={leaveQueue} className="btn-secondary">
                      取消匹配
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-dark-700 flex items-center justify-center">
                      <Swords className="w-12 h-12 text-gray-500" />
                    </div>
                    <p className="text-gray-400 mb-6">
                      {selectedSandglass ? '已选择沙漏，可以开始匹配' : '请先选择一个沙漏'}
                    </p>
                    <button
                      onClick={joinQueue}
                      disabled={!selectedSandglass}
                      className="btn-primary text-lg py-3 px-8"
                    >
                      加入匹配队列
                    </button>
                  </>
                )}
              </div>

              <div className="mt-6 p-4 bg-dark-700 rounded-lg">
                <h4 className="font-semibold mb-3">对战规则</h4>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>• 双方各有 120 秒时间和一定血量</li>
                  <li>• 释放技能消耗时间，造成伤害</li>
                  <li>• 时间耗尽或血量归零则判负</li>
                  <li>• 可使用时空反制抵消对方技能</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'ranking' && (
          <motion.div
            key="ranking"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card"
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              联赛排行榜
            </h3>
            <div className="space-y-2">
              {leaderboard.map((rank, i) => (
                <motion.div
                  key={rank.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-3 bg-dark-700 rounded-lg"
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center font-bold',
                      i === 0 && 'bg-yellow-500 text-yellow-900',
                      i === 1 && 'bg-gray-400 text-gray-900',
                      i === 2 && 'bg-orange-600 text-orange-100',
                      i > 2 && 'bg-dark-600 text-gray-400'
                    )}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{rank.playerName}</p>
                    <p className="text-sm text-gray-400">
                      {rank.tier?.toUpperCase()} · {rank.wins}胜 {rank.losses}负
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-time-300">{formatNumber(rank.points)}</p>
                    <p className="text-xs text-gray-400">积分</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card"
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-time-400" />
              对战记录
            </h3>
            {matchHistory.length === 0 ? (
              <p className="text-gray-400 text-center py-8">暂无对战记录</p>
            ) : (
              <div className="space-y-2">
                {matchHistory.map((match) => {
                  const isWin = match.winnerId === player?.id;
                  return (
                    <div
                      key={match.id}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-lg',
                        isWin ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                      )}
                    >
                      <div>
                        <p className={cn('font-bold text-lg', isWin ? 'text-green-400' : 'text-red-400')}>
                          {isWin ? '🏆 胜利' : '💔 失败'}
                        </p>
                        <p className="text-sm text-gray-400">
                          {new Date(match.createdAt).toLocaleString()} · 时长 {match.duration}s
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn('text-lg font-bold', isWin ? 'text-green-400' : 'text-red-400')}>
                          {isWin ? '+' : ''}
                          {match.player1Id === player?.id ? match.player1ScoreChange : match.player2ScoreChange}
                        </p>
                        <p className="text-xs text-gray-400">积分变化</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
