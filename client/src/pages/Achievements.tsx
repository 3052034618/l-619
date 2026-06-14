import { useEffect, useState } from 'react';
import api from '../services/api';
import { Trophy, Star, Lock, Check, Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, formatNumber } from '../utils';

interface Achievement {
  id: string;
  name: string;
  description: string;
  type: string;
  code: string;
  targetValue: number;
  rewards: any;
  points: number;
  progress: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export default function Achievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const res = await api.get('/achievements');
      setAchievements(res.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (achievementId: string) => {
    try {
      await api.post(`/achievements/${achievementId}/claim`);
      loadAchievements();
    } catch (error: any) {
      alert(error.response?.data?.error || '领取失败');
    }
  };

  const categories = [
    { id: 'all', label: '全部' },
    { id: 'craft', label: '合成' },
    { id: 'dungeon', label: '副本' },
    { id: 'league', label: '联赛' },
    { id: 'collection', label: '收藏' },
    { id: 'trade', label: '交易' },
  ];

  const filteredAchievements = achievements.filter((a) =>
    activeTab === 'all' ? true : a.type?.toLowerCase().includes(activeTab) || a.code?.toLowerCase().includes(activeTab)
  );

  const completedCount = achievements.filter((a) => a.isCompleted).length;
  const totalPoints = achievements.filter((a) => a.isCompleted).reduce((sum, a) => sum + a.points, 0);

  if (loading) return <div className="text-center text-gray-400 py-20">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-7 h-7 text-yellow-400" />
            成就系统
          </h2>
          <p className="text-gray-400 mt-1">完成挑战获得丰厚奖励</p>
        </div>
        <div className="flex gap-4">
          <div className="card py-3 px-5 text-center">
            <p className="text-sm text-gray-400">已完成</p>
            <p className="text-2xl font-bold text-green-400">
              {completedCount} / {achievements.length}
            </p>
          </div>
          <div className="card py-3 px-5 text-center">
            <p className="text-sm text-gray-400">成就点数</p>
            <p className="text-2xl font-bold text-yellow-400">{formatNumber(totalPoints)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={cn(
              'px-5 py-2 rounded-lg font-medium whitespace-nowrap transition-all',
              activeTab === cat.id
                ? 'bg-gradient-to-r from-yellow-600 to-amber-500 text-white'
                : 'bg-dark-700 text-gray-400 hover:text-white'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement, i) => {
          const progress = Math.min(100, (achievement.progress / achievement.targetValue) * 100);
          const isComplete = achievement.isCompleted;
          const canClaim = isComplete && !achievement.isClaimed;

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                'card relative overflow-hidden transition-all',
                isComplete && 'ring-2 ring-yellow-500/50'
              )}
            >
              {isComplete && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-yellow-500/20 to-transparent" />
              )}

              <div className="relative">
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0',
                      isComplete
                        ? 'bg-gradient-to-br from-yellow-500 to-amber-600'
                        : 'bg-dark-600'
                    )}
                  >
                    {isComplete ? (
                      <Trophy className="w-7 h-7 text-white" />
                    ) : (
                      <Lock className="w-7 h-7 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={cn('font-bold', isComplete ? 'text-yellow-300' : 'text-white')}>
                      {achievement.name}
                    </h3>
                    <p className="text-sm text-gray-400">{achievement.description}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">进度</span>
                    <span className={cn(isComplete ? 'text-green-400' : 'text-gray-300')}>
                      {achievement.progress} / {achievement.targetValue}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-dark-600 rounded-full overflow-hidden">
                    <motion.div
                      className={cn(
                        'h-full',
                        isComplete
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-400'
                          : 'bg-gradient-to-r from-time-500 to-time-400'
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400 font-semibold">{achievement.points} 点</span>
                    {achievement.rewards?.exp && (
                      <span className="text-green-400">+{formatNumber(achievement.rewards.exp)} EXP</span>
                    )}
                    {achievement.rewards?.gold && (
                      <span className="text-yellow-300">+{formatNumber(achievement.rewards.gold)} 💰</span>
                    )}
                  </div>

                  {canClaim ? (
                    <button
                      onClick={() => claimReward(achievement.id)}
                      className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 text-white text-sm font-semibold hover:from-green-500 hover:to-emerald-400 transition-all animate-pulse"
                    >
                      <Gift className="w-4 h-4" />
                      领取
                    </button>
                  ) : achievement.isClaimed ? (
                    <span className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-dark-600 text-gray-400 text-sm">
                      <Check className="w-4 h-4" />
                      已领取
                    </span>
                  ) : (
                    <span className="px-4 py-1.5 rounded-lg bg-dark-600 text-gray-500 text-sm">未完成</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
