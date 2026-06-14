import { useEffect, useState } from 'react';
import api from '../services/api';
import { Crown, Trophy, Sparkles, Swords, Users, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatNumber, cn } from '../utils';

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'collection' | 'league' | 'guild'>('league');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/leaderboard/${activeTab}?pageSize=50`);
      setData(res.data?.data?.items || []);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'collection' as const, label: '沙漏收藏', icon: Sparkles },
    { id: 'league' as const, label: '联赛积分', icon: Swords },
    { id: 'guild' as const, label: '公会贡献', icon: Users },
  ];

  const icons = { collection: Sparkles, league: Trophy, guild: Crown };
  const valueKey = { collection: 'collectionScore', league: 'points', guild: 'reputation' };
  const nameKey = { collection: 'nickname', league: 'playerName', guild: 'name' };

  if (loading) return <div className="text-center text-gray-400 py-20">加载中...</div>;

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="w-7 h-7 text-yellow-400" />
          全服排行榜
        </h2>
        <p className="text-gray-400 mt-1">查看全服最强玩家和公会</p>
      </div>

      <div className="flex gap-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
              activeTab === tab.id
                ? 'bg-gradient-to-r from-yellow-600 to-amber-500 text-white shadow-lg shadow-yellow-500/25'
                : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600'
            )}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 0, 2].map((idx) => {
          const item = top3[idx];
          if (!item) return null;
          const Icon = idx === 0 ? Crown : Star;
          const heights = ['h-48', 'h-56', 'h-40'];
          const colors = [
            'from-gray-400 to-gray-500',
            'from-yellow-400 to-amber-500',
            'from-orange-500 to-amber-600',
          ];
          const places = ['🥈 第2名', '🥇 第1名', '🥉 第3名'];

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex flex-col items-center justify-end"
            >
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center mb-4 animate-pulse-slow`}>
                <Icon className="w-10 h-10 text-white" />
              </div>
              <div className="card w-full text-center">
                <p className="text-xl font-bold truncate">
                  {item[nameKey[activeTab]] || item.username || '未知'}
                </p>
                <p className={`text-3xl font-bold mt-2 bg-gradient-to-r ${colors[idx]} bg-clip-text text-transparent`}>
                  {formatNumber(item[valueKey[activeTab]] || 0)}
                </p>
                <p className="text-sm text-gray-400 mt-1">{places[idx]}</p>
              </div>
              <div className={`w-full ${heights[idx]} bg-gradient-to-t from-time-600/30 to-transparent rounded-b-xl -mt-2`} />
            </motion.div>
          );
        })}
      </div>

      <div className="card">
        <h3 className="text-lg font-bold mb-4">完整排行榜</h3>
        <div className="space-y-2">
          {rest.map((item, i) => {
            const rank = i + 4;
            return (
              <motion.div
                key={item.id || i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-4 p-4 bg-dark-700/50 rounded-xl hover:bg-dark-700 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center font-bold text-gray-400">
                  #{rank}
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-time-500/30 to-purple-500/30 flex items-center justify-center">
                  <icons[activeTab] className="w-6 h-6 text-time-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">
                    {item[nameKey[activeTab]] || item.username || item.playerName || '未知'}
                  </p>
                  {activeTab === 'league' && (
                    <p className="text-xs text-gray-400">
                      {item.tier?.toUpperCase()} · {item.wins || 0}胜 {item.losses || 0}负
                    </p>
                  )}
                  {activeTab === 'guild' && (
                    <p className="text-xs text-gray-400">
                      Lv.{item.level || 1} · {item.memberCount || 0}成员
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-time-300">
                    {formatNumber(item[valueKey[activeTab]] || 0)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
