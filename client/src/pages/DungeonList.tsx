import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Map, Clock, Users, Star, Play, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { ERA_LABELS, QUALITY_LABELS, formatNumber, cn } from '../utils';

interface Dungeon {
  id: string;
  name: string;
  description: string;
  era: string;
  difficulty: string;
  timeFlowRate: number;
  maxTimeBalance: number;
  requiredLevel: number;
  minPlayers: number;
  maxPlayers: number;
  popularity: number;
  rewards: {
    exp: number;
    gold: number;
    fragmentChance: number;
    rareFragmentChance: number;
    legendaryFragmentChance: number;
  };
}

export default function DungeonList() {
  const navigate = useNavigate();
  const { player } = useAuthStore();
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEra, setSelectedEra] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  useEffect(() => {
    loadDungeons();
  }, []);

  const loadDungeons = async () => {
    try {
      const res = await api.get('/dungeons?pageSize=100');
      setDungeons(res.data?.data?.items || []);
    } finally {
      setLoading(false);
    }
  };

  const startDungeon = async (dungeonId: string) => {
    try {
      const res = await api.post('/dungeons/session', { dungeonId });
      if (res.data.success) {
        navigate(`/dungeons/${res.data.data.id}`);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '创建副本失败');
    }
  };

  const eras = ['all', 'ancient', 'medieval', 'renaissance', 'modern', 'future', 'mythical'];
  const difficulties = ['all', 'easy', 'normal', 'hard', 'nightmare', 'hell'];

  const filteredDungeons = dungeons.filter((d) => {
    if (selectedEra !== 'all' && d.era !== selectedEra) return false;
    if (selectedDifficulty !== 'all' && d.difficulty !== selectedDifficulty) return false;
    return true;
  });

  if (loading) return <div className="text-center text-gray-400 py-20">加载中...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Map className="w-7 h-7 text-green-400" />
          时光副本
        </h2>
        <p className="text-gray-400 mt-1">穿越时空，探索不同年代的神秘世界</p>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-sm text-gray-400 block mb-2">时代</label>
            <select
              value={selectedEra}
              onChange={(e) => setSelectedEra(e.target.value)}
              className="input w-40"
            >
              {eras.map((era) => (
                <option key={era} value={era}>
                  {era === 'all' ? '全部' : ERA_LABELS[era]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-2">难度</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="input w-40"
            >
              {difficulties.map((d) => (
                <option key={d} value={d}>
                  {d === 'all' ? '全部' : QUALITY_LABELS[d] || d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDungeons.map((dungeon, i) => {
          const locked = (player?.level || 0) < dungeon.requiredLevel;
          return (
            <motion.div
              key={dungeon.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'card relative overflow-hidden transition-all',
                locked && 'opacity-60'
              )}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-time-500/20 to-transparent rounded-bl-full" />
              
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold">{dungeon.name}</h3>
                    <p className="text-gray-400 text-sm">{ERA_LABELS[dungeon.era]}</p>
                  </div>
                  <span className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold',
                    dungeon.difficulty === 'easy' && 'bg-green-500/20 text-green-400',
                    dungeon.difficulty === 'normal' && 'bg-blue-500/20 text-blue-400',
                    dungeon.difficulty === 'hard' && 'bg-yellow-500/20 text-yellow-400',
                    dungeon.difficulty === 'nightmare' && 'bg-orange-500/20 text-orange-400',
                    dungeon.difficulty === 'hell' && 'bg-red-500/20 text-red-400',
                  )}>
                    {dungeon.difficulty.toUpperCase()}
                  </span>
                </div>

                <p className="text-gray-300 text-sm mb-4 line-clamp-2">{dungeon.description}</p>

                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-time-400" />
                    <span className="text-gray-400">
                      {Math.floor(dungeon.maxTimeBalance / 60)}分钟
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-gray-400">流速 {dungeon.timeFlowRate / 100}x</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-400">
                      {dungeon.minPlayers}-{dungeon.maxPlayers}人
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-purple-400" />
                    <span className="text-gray-400">Lv.{dungeon.requiredLevel}+</span>
                  </div>
                </div>

                <div className="bg-dark-700 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-400 mb-2">预计奖励</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="text-green-400">EXP {formatNumber(dungeon.rewards.exp)}</span>
                    <span className="text-yellow-400">💰 {formatNumber(dungeon.rewards.gold)}</span>
                    <span className="text-purple-400">
                      碎片 {(dungeon.rewards.fragmentChance * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => startDungeon(dungeon.id)}
                  disabled={locked}
                  className={cn(
                    'w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all',
                    locked
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'btn-primary'
                  )}
                >
                  <Play className="w-5 h-5" />
                  {locked ? `需要 Lv.${dungeon.requiredLevel}` : '开始探险'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
