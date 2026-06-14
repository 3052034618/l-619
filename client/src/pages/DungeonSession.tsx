import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocketStore } from '../store/socketStore';
import api from '../services/api';
import {
  Clock,
  Users,
  Gem,
  MapPin,
  AlertTriangle,
  LogOut,
  Play,
  Sparkles,
  Heart,
  Skull,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber, cn } from '../utils';

export default function DungeonSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { dungeonState, joinDungeon, leaveDungeon, updatePosition, isConnected } = useSocketStore();
  const [session, setSession] = useState<any>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isJoining, setIsJoining] = useState(true);
  const positionUpdateRef = useRef<number | null>(null);

  useEffect(() => {
    if (sessionId) {
      joinDungeon(sessionId);
      loadSession();
      setIsJoining(false);
    }
    return () => {
      if (sessionId) leaveDungeon(sessionId);
    };
  }, [sessionId]);

  useEffect(() => {
    if (isStarted && dungeonState && sessionId) {
      positionUpdateRef.current = window.setInterval(() => {
        updatePosition(
          sessionId!,
          Math.floor(Math.random() * 100),
          Math.floor(Math.random() * 100),
          Math.floor(Math.random() * 10)
        );
      }, 5000);
    }
    return () => {
      if (positionUpdateRef.current) clearInterval(positionUpdateRef.current);
    };
  }, [isStarted, dungeonState]);

  const loadSession = async () => {
    try {
      const res = await api.get(`/dungeons/session/${sessionId}`);
      setSession(res.data?.data || null);
    } catch {}
  };

  const startSession = async () => {
    try {
      const res = await api.post(`/dungeons/session/${sessionId}/start`);
      if (res.data.success) {
        setIsStarted(true);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '开始失败');
    }
  };

  const collectFragment = async () => {
    try {
      await api.post(`/dungeons/session/${sessionId}/fragment`);
    } catch (error: any) {
      console.log(error.response?.data?.error);
    }
  };

  const abandon = async () => {
    if (!confirm('确定要放弃本次探险吗？')) return;
    try {
      await api.post(`/dungeons/session/${sessionId}/abandon`);
      navigate('/dungeons');
    } catch (error: any) {
      alert(error.response?.data?.error || '操作失败');
    }
  };

  const state = dungeonState || session;

  if (isJoining || !state) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 mx-auto mb-4 border-4 border-time-500 border-t-transparent rounded-full"
          />
          <p className="text-gray-400">连接副本中...</p>
        </div>
      </div>
    );
  }

  const timeBalance = state.timeBalance || 0;
  const minutes = Math.floor(timeBalance / 60);
  const seconds = timeBalance % 60;
  const timePercent = (timeBalance / (state.maxTimeBalance || 600)) * 100;
  const lowTime = timeBalance < 60;

  return (
    <div className="h-full -m-6 flex flex-col">
      <div className="bg-dark-800/90 backdrop-blur-sm border-b border-time-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-gray-400">时间余额</p>
              <div className="flex items-center gap-2">
                <Clock className={cn('w-6 h-6', lowTime ? 'text-red-400 animate-pulse' : 'text-time-400')} />
                <p className={cn('text-2xl font-bold font-mono', lowTime && 'text-red-400')}>
                  {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                </p>
              </div>
              <div className="w-48 h-2 bg-dark-600 rounded-full overflow-hidden mt-1">
                <motion.div
                  className={cn('h-full', lowTime ? 'bg-red-500' : 'bg-gradient-to-r from-time-500 to-sand-500')}
                  initial={{ width: '100%' }}
                  animate={{ width: `${timePercent}%` }}
                />
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400">碎片回收进度</p>
              <div className="flex items-center gap-2">
                <Gem className="w-6 h-6 text-purple-400" />
                <p className="text-2xl font-bold text-purple-300">
                  {(state.fragmentProgress || 0).toFixed(0)}%
                </p>
              </div>
              <div className="w-48 h-2 bg-dark-600 rounded-full overflow-hidden mt-1">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  animate={{ width: `${state.fragmentProgress || 0}%` }}
                />
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400">时间流速</p>
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn(
                  'w-6 h-6',
                  (state.currentTimeFlowRate || 100) > 150 ? 'text-orange-400' : 'text-green-400'
                )} />
                <p className="text-2xl font-bold">
                  {((state.currentTimeFlowRate || 100) / 100).toFixed(1)}x
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isStarted && state.status === 'waiting' && (
              <button onClick={startSession} className="btn-primary flex items-center gap-2">
                <Play className="w-5 h-5" />
                开始探险
              </button>
            )}
            <button onClick={collectFragment} className="btn-secondary flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              收集碎片
            </button>
            <button onClick={abandon} className="btn-danger flex items-center gap-2">
              <LogOut className="w-5 h-5" />
              放弃
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 p-6 bg-dark-900 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-time-400 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `pulse ${2 + Math.random() * 3}s infinite`,
                }}
              />
            ))}
          </div>

          <AnimatePresence>
            {state.events?.slice(-3).map((event: any) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 bg-dark-700/90 backdrop-blur px-6 py-3 rounded-xl border border-time-500/30 z-10"
              >
                <p className="font-semibold text-time-300">⚡ {event.data?.message || '事件发生！'}</p>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="relative h-full flex items-center justify-center">
            <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
              {(state.playerPositions || []).map((pos: any) => (
                <motion.div
                  key={pos.playerId}
                  className="card text-center"
                  animate={{
                    x: (pos.x - 50) * 0.5,
                    y: (pos.y - 50) * 0.5,
                  }}
                  transition={{ type: 'spring', stiffness: 100 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-time-400" />
                    <span className="font-semibold">玩家 #{pos.playerId.substring(0, 4)}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {pos.isAlive ? (
                      <Heart className="w-5 h-5 text-green-400" />
                    ) : (
                      <Skull className="w-5 h-5 text-red-400" />
                    )}
                    <div className="flex-1">
                      <div className="w-full h-2 bg-dark-600 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                          animate={{ width: `${(pos.hp / pos.maxHp) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {pos.hp} / {pos.maxHp} HP
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    位置: ({pos.x?.toFixed(0)}, {pos.y?.toFixed(0)}, {pos.z?.toFixed(0)})
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-80 bg-dark-800/90 backdrop-blur-sm border-l border-time-500/20 p-4 space-y-4 overflow-y-auto">
          <div>
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              队伍成员 ({state.playerPositions?.length || 0})
            </h3>
            <div className="space-y-2">
              {(state.playerPositions || []).map((pos: any) => (
                <div key={pos.playerId} className="bg-dark-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">玩家 #{pos.playerId.substring(0, 6)}</span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded',
                      pos.isAlive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    )}>
                      {pos.isAlive ? '存活' : '阵亡'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Gem className="w-5 h-5 text-purple-400" />
              已收集碎片 ({state.collectedFragments?.length || 0})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(state.collectedFragments || []).slice(-10).map((f: any) => (
                <div key={f.id} className="bg-dark-700 rounded-lg p-2">
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-gray-400">
                    {f.quality?.toUpperCase()} · {f.era?.toUpperCase()}
                  </p>
                </div>
              ))}
              {(!state.collectedFragments || state.collectedFragments.length === 0) && (
                <p className="text-gray-500 text-sm text-center py-4">暂无收集</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-time-400" />
              事件日志
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(state.events || []).slice(-10).reverse().map((event: any) => (
                <div key={event.id} className="bg-dark-700 rounded-lg p-2">
                  <p className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                  <p className="text-sm">{event.data?.message || event.type}</p>
                </div>
              ))}
              {(!state.events || state.events.length === 0) && (
                <p className="text-gray-500 text-sm text-center py-4">暂无事件</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
