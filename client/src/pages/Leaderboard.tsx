import { useEffect, useState, Component, ReactNode } from 'react';
import api from '../services/api';
import { Crown, Trophy, Sparkles, Swords, Users, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatNumber, cn } from '../utils';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error('Leaderboard Error:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="card text-center py-20">
          <p className="text-red-400 text-lg mb-2">⚠️ 加载失败</p>
          <p className="text-gray-400 text-sm">排行榜数据加载出错，请稍后重试</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'collection' | 'league' | 'guild'>('league');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/reports/leaderboard/${activeTab}?pageSize=50`);
      if (res.data?.success) {
        setData(res.data.data?.items || []);
      } else {
        setData([]);
      }
    } catch (err: any) {
      setError(err.message || '加载失败');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'collection' as const, label: '沙漏收藏', icon: Sparkles },
    { id: 'league' as const, label: '联赛积分', icon: Swords },
    { id: 'guild' as const, label: '公会贡献', icon: Users },
  ];

  const icons: Record<string, any> = { collection: Sparkles, league: Trophy, guild: Crown };
  const valueKeyMap: Record<string, string> = { collection: 'collectionScore', league: 'points', guild: 'reputation' };
  const nameKeyMap: Record<string, string> = { collection: 'nickname', league: 'playerName', guild: 'name' };

  const getSafeValue = (item: any, key: string, fallback: any = 0): any => {
    try {
      if (item[key] !== undefined && item[key] !== null) return item[key];
      const fallbackKeys = ['points', 'collectionScore', 'reputation', 'score', 'value'];
      for (const fk of fallbackKeys) {
        if (item[fk] !== undefined && item[fk] !== null) return item[fk];
      }
      return fallback;
    } catch {
      return fallback;
    }
  };

  const getSafeName = (item: any, key: string): string => {
    try {
      if (item[key]) return item[key];
      const fallbackKeys = ['playerName', 'nickname', 'username', 'name', 'title'];
      for (const fk of fallbackKeys) {
        if (item[fk]) return item[fk];
      }
      return '未知玩家';
    } catch {
      return '未知玩家';
    }
  };

  if (loading) return <div className="text-center text-gray-400 py-20">加载中...</div>;
  if (error) return (
    <div className="card text-center py-20">
      <p className="text-red-400 text-lg mb-2">⚠️ 加载失败</p>
      <p className="text-gray-400 text-sm mb-4">{error}</p>
      <button onClick={loadData} className="btn-primary">重新加载</button>
    </div>
  );

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="w-7 h-7 text-yellow-400" />
            全服排行榜
          </h2>
          <p className="text-gray-400 mt-1">查看全服最强玩家和公会</p>
        </div>

        <div className="flex gap-4 flex-wrap">
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

        {top3.length > 0 ? (
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

              const displayName = getSafeName(item, nameKeyMap[activeTab]);
              const displayValue = formatNumber(getSafeValue(item, valueKeyMap[activeTab], 0));

              return (
                <motion.div
                  key={`top-${idx}`}
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
                      {displayName}
                    </p>
                    <p className={`text-3xl font-bold mt-2 bg-gradient-to-r ${colors[idx]} bg-clip-text text-transparent`}>
                      {displayValue}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">{places[idx]}</p>
                  </div>
                  <div className={`w-full ${heights[idx]} bg-gradient-to-t from-time-600/30 to-transparent rounded-b-xl -mt-2`} />
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-400">暂无排行榜数据</p>
          </div>
        )}

        <div className="card">
          <h3 className="text-lg font-bold mb-4">完整排行榜</h3>
          {rest.length > 0 ? (
            <div className="space-y-2">
              {rest.map((item, i) => {
                const rank = i + 4;
                const IconComp = icons[activeTab] || Trophy;
                const displayName = getSafeName(item, nameKeyMap[activeTab]);
                const displayValue = formatNumber(getSafeValue(item, valueKeyMap[activeTab], 0));

                return (
                  <motion.div
                    key={item?.id || `item-${i}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.5) }}
                    className="flex items-center gap-4 p-4 bg-dark-700/50 rounded-xl hover:bg-dark-700 transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center font-bold text-gray-400">
                      #{rank}
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-time-500/30 to-purple-500/30 flex items-center justify-center">
                      <IconComp className="w-6 h-6 text-time-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {displayName}
                      </p>
                      {activeTab === 'league' && (
                        <p className="text-xs text-gray-400">
                          {String(item.tier || 'bronze').toUpperCase()} · {item.wins || 0}胜 {item.losses || 0}负
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
                        {displayValue}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">暂无更多数据</p>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
