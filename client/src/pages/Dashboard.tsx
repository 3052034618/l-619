import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import api from '../services/api';
import {
  Clock,
  Hammer,
  Map,
  Swords,
  ShoppingBag,
  Users,
  Trophy,
  TrendingUp,
  Sparkles,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatNumber, calculateMasteryLevel } from '../utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const { player } = useAuthStore();
  const { notifications } = useSocketStore();
  const [stats, setStats] = useState({
    dungeons: 0,
    crafts: 0,
    trades: 0,
    league: { wins: 0, losses: 0 },
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [leagueRes] = await Promise.all([api.get('/league/history?pageSize=100')]);
        const matches = leagueRes.data?.data?.items || [];
        setStats((s) => ({
          ...s,
          league: {
            wins: matches.filter((m: any) => m.winnerId === player?.id).length,
            losses: matches.filter((m: any) => m.winnerId && m.winnerId !== player?.id).length,
          },
        }));
      } catch {}
    };
    if (player) loadStats();
  }, [player]);

  const quickActions = [
    { icon: Hammer, label: '工坊合成', path: '/workshop', color: 'from-time-500 to-time-600' },
    { icon: Map, label: '时光副本', path: '/dungeons', color: 'from-green-500 to-emerald-600' },
    { icon: Swords, label: '时光联赛', path: '/league', color: 'from-red-500 to-orange-600' },
    { icon: ShoppingBag, label: '交易市场', path: '/trade', color: 'from-yellow-500 to-amber-600' },
    { icon: Users, label: '我的公会', path: '/guild', color: 'from-blue-500 to-indigo-600' },
    { icon: Trophy, label: '成就系统', path: '/achievements', color: 'from-purple-500 to-pink-600' },
  ];

  if (!player) return <div className="text-center text-gray-400">加载中...</div>;

  const expForNext = Math.floor(100 * Math.pow(player.level, 1.5));
  const expProgress = (player.exp / expForNext) * 100;

  return (
    <div className="space-y-6">
      <div className="card bg-gradient-to-br from-dark-800 via-time-900/30 to-dark-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-time-300 to-sand-300 bg-clip-text text-transparent mb-2">
              欢迎回来，{player.nickname || player.username}！
            </h2>
            <p className="text-gray-400">准备好进行新的时光冒险了吗？</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-time-300">Lv.{player.level}</p>
              <div className="w-32 h-2 bg-dark-600 rounded-full overflow-hidden mt-1">
                <motion.div
                  className="h-full bg-gradient-to-r from-time-500 to-sand-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${expProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {player.exp} / {formatNumber(expForNext)} EXP
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-time-500/20 flex items-center justify-center">
              <Hammer className="w-6 h-6 text-time-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">工匠等级</p>
              <p className="text-2xl font-bold text-time-300">Lv.{calculateMasteryLevel(player.craftMastery)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">收藏度</p>
              <p className="text-2xl font-bold text-purple-300">{formatNumber(player.collectionScore)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Swords className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">联赛积分</p>
              <p className="text-2xl font-bold text-red-300">{formatNumber(player.leaguePoints)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">公会贡献</p>
              <p className="text-2xl font-bold text-green-300">{formatNumber(player.guildContribution)}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          快捷操作
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.path}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(action.path)}
              className={`card p-5 text-center bg-gradient-to-br ${action.color} hover:shadow-xl transition-all`}
            >
              <action.icon className="w-8 h-8 mx-auto mb-2 text-white" />
              <p className="font-semibold text-white">{action.label}</p>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            联赛战绩
          </h3>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <p className="text-4xl font-bold text-green-400">{stats.league.wins}</p>
              <p className="text-gray-400 text-sm">胜场</p>
            </div>
            <div className="text-4xl font-bold text-gray-600">:</div>
            <div className="text-center">
              <p className="text-4xl font-bold text-red-400">{stats.league.losses}</p>
              <p className="text-gray-400 text-sm">败场</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-time-400">
                {stats.league.wins + stats.league.losses > 0
                  ? Math.round((stats.league.wins / (stats.league.wins + stats.league.losses)) * 100)
                  : 0}
                %
              </p>
              <p className="text-gray-400 text-sm">胜率</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-time-400" />
            最新通知
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-gray-400 text-center py-8">暂无通知</p>
            ) : (
              notifications
                .slice()
                .reverse()
                .slice(0, 5)
                .map((n) => (
                  <div key={n.id} className="bg-dark-700 rounded-lg p-3">
                    <p className="text-sm">{n.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(n.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
