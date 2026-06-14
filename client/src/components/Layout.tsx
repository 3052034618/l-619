import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import {
  Home,
  Hammer,
  Map,
  Swords,
  ShoppingBag,
  Users,
  Trophy,
  FileBarChart,
  Crown,
  LogOut,
  Bell,
  User,
  Clock,
  Coins,
  Gem,
  Star,
} from 'lucide-react';
import { cn, formatNumber, calculateMasteryLevel } from '../utils';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const navItems = [
  { path: '/', icon: Home, label: '大厅' },
  { path: '/workshop', icon: Hammer, label: '工坊' },
  { path: '/dungeons', icon: Map, label: '副本' },
  { path: '/league', icon: Swords, label: '联赛' },
  { path: '/trade', icon: ShoppingBag, label: '交易' },
  { path: '/guild', icon: Users, label: '公会' },
  { path: '/achievements', icon: Trophy, label: '成就' },
  { path: '/reports', icon: FileBarChart, label: '报告' },
  { path: '/leaderboard', icon: Crown, label: '排行' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { player, logout } = useAuthStore();
  const { notifications, clearNotifications, isConnected } = useSocketStore();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-dark-900 flex">
      <aside className="w-64 bg-dark-800/95 border-r border-time-500/20 flex flex-col">
        <div className="p-6 border-b border-time-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-time-500 to-time-700 flex items-center justify-center animate-glow">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-time-300 to-sand-300 bg-clip-text text-transparent">
                时光沙漏
              </h1>
              <p className="text-xs text-gray-400">Time Sandglass</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-time-600/50 to-transparent text-time-200 border-l-2 border-time-400'
                    : 'text-gray-400 hover:text-white hover:bg-dark-600/50'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {player && (
          <div className="p-4 border-t border-time-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full bg-gradient-to-br from-time-500 to-sand-500 flex items-center justify-center cursor-pointer hover:ring-2 ring-time-400 transition-all"
                onClick={() => navigate(`/player/${player.id}`)}
              >
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{player.nickname || player.username}</p>
                <p className="text-xs text-gray-400">Lv.{player.level}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <div className="bg-dark-700 rounded px-2 py-1.5">
                <div className="flex items-center gap-1 text-yellow-400">
                  <Coins className="w-3 h-3" />
                  <span>{formatNumber(player.gold)}</span>
                </div>
              </div>
              <div className="bg-dark-700 rounded px-2 py-1.5">
                <div className="flex items-center gap-1 text-purple-400">
                  <Gem className="w-3 h-3" />
                  <span>{formatNumber(player.gems)}</span>
                </div>
              </div>
              <div className="bg-dark-700 rounded px-2 py-1.5">
                <div className="flex items-center gap-1 text-blue-400">
                  <Star className="w-3 h-3" />
                  <span>工匠 Lv.{calculateMasteryLevel(player.craftMastery)}</span>
                </div>
              </div>
              <div className="bg-dark-700 rounded px-2 py-1.5">
                <div className="flex items-center gap-1 text-green-400">
                  <Trophy className="w-3 h-3" />
                  <span>{formatNumber(player.leaguePoints)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-dark-800/80 backdrop-blur-sm border-b border-time-500/20 flex items-center justify-between px-6">
          <h2 className="text-lg font-semibold">
            {navItems.find((n) => n.path === location.pathname)?.label || '大厅'}
          </h2>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className={cn('w-2 h-2 rounded-full', isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400')} />
              <span className="text-gray-400">{isConnected ? '已连接' : '断开连接'}</span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-dark-600 transition-all"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                    {Math.min(notifications.length, 99)}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-dark-700 rounded-xl border border-time-500/30 shadow-2xl z-50"
                  >
                    <div className="flex items-center justify-between p-3 border-b border-time-500/20">
                      <h3 className="font-semibold">通知</h3>
                      <button
                        onClick={clearNotifications}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        清空
                      </button>
                    </div>
                    <div className="divide-y divide-dark-600">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-center text-gray-400 text-sm">暂无通知</p>
                      ) : (
                        notifications
                          .slice()
                          .reverse()
                          .map((n) => (
                            <div key={n.id} className="p-3 hover:bg-dark-600/50">
                              <p className="text-sm">{n.message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(n.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
