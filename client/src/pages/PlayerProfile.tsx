import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import {
  User,
  Star,
  Hammer,
  Trophy,
  Sparkles,
  Clock,
  Map,
  Coins,
  Gem,
  Crown,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatNumber, calculateMasteryLevel, QUALITY_COLORS, QUALITY_LABELS, cn } from '../utils';

export default function PlayerProfile() {
  const { id } = useParams();
  const { player: currentPlayer } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [adventures, setAdventures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'workshop' | 'adventures'>('workshop');

  const isOwnProfile = currentPlayer?.id === id;

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    try {
      const [profileRes, adventureRes] = await Promise.all([
        api.get(`/reports/player/${id}/workshop`),
        api.get(`/reports/player/${id}/adventures?pageSize=20`),
      ]);
      setProfile(profileRes.data?.data);
      setAdventures(adventureRes.data?.data?.items || []);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center text-gray-400 py-20">加载中...</div>;
  if (!profile) return <div className="text-center text-gray-400 py-20">玩家不存在</div>;

  const player = profile.player;
  const sandglasses = profile.sandglasses || [];

  return (
    <div className="space-y-6">
      <div className="card bg-gradient-to-br from-dark-800 via-time-900/30 to-dark-800">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-28 h-28 rounded-2xl bg-gradient-to-br from-time-500 to-sand-500 flex items-center justify-center flex-shrink-0"
          >
            <User className="w-14 h-14 text-white" />
          </motion.div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold">{player.nickname || player.username}</h2>
              {isOwnProfile && (
                <span className="px-2 py-1 bg-time-600/30 text-time-300 text-xs rounded-full">
                  我自己
                </span>
              )}
            </div>
            <p className="text-gray-400 mb-4">@{player.username}</p>

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-dark-700 px-4 py-2 rounded-lg">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="font-bold">Lv.{player.level}</span>
              </div>
              <div className="flex items-center gap-2 bg-dark-700 px-4 py-2 rounded-lg">
                <Hammer className="w-5 h-5 text-time-400" />
                <span className="font-bold">工匠 Lv.{calculateMasteryLevel(player.craftMastery)}</span>
              </div>
              <div className="flex items-center gap-2 bg-dark-700 px-4 py-2 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span className="font-bold">{formatNumber(player.collectionScore)} 收藏度</span>
              </div>
              <div className="flex items-center gap-2 bg-dark-700 px-4 py-2 rounded-lg">
                <Trophy className="w-5 h-5 text-red-400" />
                <span className="font-bold">{formatNumber(player.leaguePoints)} 联赛积分</span>
              </div>
              <div className="flex items-center gap-2 bg-dark-700 px-4 py-2 rounded-lg">
                <Users className="w-5 h-5 text-green-400" />
                <span className="font-bold">{formatNumber(player.guildContribution)} 公会贡献</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-dark-700 rounded-xl p-4 text-center">
              <Coins className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-yellow-400">{formatNumber(player.gold || 0)}</p>
              <p className="text-xs text-gray-400">金币</p>
            </div>
            <div className="bg-dark-700 rounded-xl p-4 text-center">
              <Gem className="w-6 h-6 text-purple-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-purple-400">{formatNumber(player.gems || 0)}</p>
              <p className="text-xs text-gray-400">宝石</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setActiveTab('workshop')}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
            activeTab === 'workshop'
              ? 'bg-time-600 text-white'
              : 'bg-dark-700 text-gray-400 hover:text-white'
          )}
        >
          <Hammer className="w-5 h-5" />
          时光工坊
        </button>
        <button
          onClick={() => setActiveTab('adventures')}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
            activeTab === 'adventures'
              ? 'bg-time-600 text-white'
              : 'bg-dark-700 text-gray-400 hover:text-white'
          )}
        >
          <Map className="w-5 h-5" />
          冒险记录
        </button>
      </div>

      {activeTab === 'workshop' ? (
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              工坊布局
            </h3>
            <div className="bg-dark-700 rounded-xl p-8 min-h-48 flex items-center justify-center">
              {player.workshopLayout && Object.keys(player.workshopLayout).length > 0 ? (
                <pre className="text-sm text-gray-400">
                  {JSON.stringify(player.workshopLayout, null, 2)}
                </pre>
              ) : (
                <p className="text-gray-500">该玩家尚未布置工坊</p>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              珍贵沙漏收藏 ({sandglasses.length})
            </h3>
            {sandglasses.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无沙漏收藏</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sandglasses.map((s: any, i: number) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      'p-4 rounded-xl border-2 quality-bg-' + s.rarity,
                      'quality-' + s.rarity
                    )}
                  >
                    <h4 className="font-bold text-lg" style={{ color: QUALITY_COLORS[s.rarity] }}>
                      {s.name}
                    </h4>
                    <p className={`text-sm quality-${s.rarity} mb-3`} style={{ color: QUALITY_COLORS[s.rarity] }}>
                      {QUALITY_LABELS[s.rarity]}
                    </p>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">时光掌控力</span>
                        <span className="text-time-300 font-bold">⚡ {formatNumber(s.temporalControl)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">特效概率</span>
                        <span className="text-purple-300 font-bold">
                          {(s.specialEffectChance * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">收藏价值</span>
                        <span className="text-yellow-300 font-bold">⭐ {formatNumber(s.collectionValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">使用次数</span>
                        <span className="text-gray-300">
                          {s.remainingUses} / {s.maxUses}
                        </span>
                      </div>
                    </div>

                    {s.affixes?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-dark-600">
                        <p className="text-xs text-gray-400 mb-2">词缀:</p>
                        <div className="flex flex-wrap gap-1">
                          {s.affixes.map((a: any, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-dark-600 rounded text-xs text-time-300"
                            >
                              {a.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-time-400" />
            历史冒险记录 ({adventures.length})
          </h3>
          {adventures.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无冒险记录</p>
          ) : (
            <div className="space-y-2">
              {adventures.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Map className="w-6 h-6 text-green-400" />
                    <div>
                      <p className="font-semibold">副本 #{a.dungeonId?.substring(0, 8)}</p>
                      <p className="text-sm text-gray-400">
                        {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'font-bold',
                      a.status === 'completed' && 'text-green-400',
                      a.status === 'failed' && 'text-red-400',
                      a.status === 'abandoned' && 'text-gray-400',
                      a.status === 'in_progress' && 'text-blue-400'
                    )}>
                      {a.status === 'completed' && '✅ 通关'}
                      {a.status === 'failed' && '❌ 失败'}
                      {a.status === 'abandoned' && '🚪 放弃'}
                      {a.status === 'in_progress' && '⏳ 进行中'}
                    </p>
                    <p className="text-sm text-gray-400">
                      时长 {a.duration || 0}秒 · 进度 {(a.fragmentProgress || 0).toFixed(0)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
