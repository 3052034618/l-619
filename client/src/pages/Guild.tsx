import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import {
  Users,
  Building2,
  Crown,
  Coins,
  Star,
  Plus,
  ArrowUp,
  LogOut,
  TrendingUp,
  Clock,
  Hammer,
  Shield,
  Sparkles,
  Search,
  Check,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber, cn } from '../utils';

interface Guild {
  id: string;
  name: string;
  tag: string;
  description: string;
  level: number;
  exp: number;
  gold: number;
  reputation: number;
  maxMembers: number;
  memberCount: number;
  craftBonus: number;
  dungeonBonus: number;
  leaderId: string;
  members: any[];
  buildings: any[];
}

export default function Guild() {
  const { player } = useAuthStore();
  const [guild, setGuild] = useState<Guild | null>(null);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', tag: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [isGuildMember, setIsGuildMember] = useState(false);

  useEffect(() => {
    loadGuilds();
  }, []);

  const loadGuilds = async () => {
    try {
      const res = await api.get('/guilds?pageSize=50');
      const list = res.data?.data?.items || [];
      setGuilds(list);

      const playerGuild = list.find((g: any) =>
        g.members?.some((m: any) => m.playerId === player?.id)
      );
      if (playerGuild) {
        const detailRes = await api.get(`/guilds/${playerGuild.id}`);
        setGuild(detailRes.data?.data);
        setIsGuildMember(true);
      }
    } catch {}
  };

  const createGuild = async () => {
    if (!createForm.name) {
      alert('请输入公会名称');
      return;
    }
    try {
      const res = await api.post('/guilds/create', createForm);
      if (res.data.success) {
        setShowCreateModal(false);
        loadGuilds();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '创建失败');
    }
  };

  const joinGuild = async (guildId: string) => {
    try {
      const res = await api.post(`/guilds/${guildId}/join`);
      if (res.data.success) {
        loadGuilds();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '加入失败');
    }
  };

  const leaveGuild = async () => {
    if (!confirm('确定要离开公会吗？')) return;
    try {
      await api.post('/guilds/leave');
      setGuild(null);
      setIsGuildMember(false);
      loadGuilds();
    } catch (error: any) {
      alert(error.response?.data?.error || '操作失败');
    }
  };

  const contributeGold = async () => {
    const amount = prompt('请输入贡献金币数量：');
    if (!amount) return;
    try {
      const res = await api.post('/guilds/contribute', { gold: Number(amount) });
      if (res.data.success) {
        alert(`贡献成功！获得 ${res.data.data.contribution} 贡献度`);
        const detailRes = await api.get(`/guilds/${guild?.id}`);
        setGuild(detailRes.data?.data);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '贡献失败');
    }
  };

  const upgradeBuilding = async (buildingId: string) => {
    try {
      const res = await api.post(`/guilds/building/${buildingId}/upgrade`);
      if (res.data.success) {
        const detailRes = await api.get(`/guilds/${guild?.id}`);
        setGuild(detailRes.data?.data);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '升级失败');
    }
  };

  if (!isGuildMember || !guild) {
    const filteredGuilds = guilds.filter((g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.tag && g.tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-7 h-7 text-blue-400" />
              公会大厅
            </h2>
            <p className="text-gray-400 mt-1">加入或创建公会，享受集体加成</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            创建公会
          </button>
        </div>

        <div className="card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
              placeholder="搜索公会名称或标签..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGuilds.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold">
                    {g.tag && <span className="text-time-400 mr-2">[{g.tag}]</span>}
                    {g.name}
                  </h3>
                  <p className="text-sm text-gray-400">Lv.{g.level}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-4 line-clamp-2">
                {g.description || '这个公会很神秘，没有留下介绍...'}
              </p>

              <div className="grid grid-cols-3 gap-2 mb-4 text-center text-sm">
                <div className="bg-dark-700 rounded p-2">
                  <p className="text-gray-400 text-xs">成员</p>
                  <p className="font-bold">{g.memberCount}/{g.maxMembers}</p>
                </div>
                <div className="bg-dark-700 rounded p-2">
                  <p className="text-gray-400 text-xs">声望</p>
                  <p className="font-bold text-purple-300">{formatNumber(g.reputation)}</p>
                </div>
                <div className="bg-dark-700 rounded p-2">
                  <p className="text-gray-400 text-xs">加成</p>
                  <p className="font-bold text-green-300">+{Math.round(((g.craftBonus || 1) - 1) * 100)}%</p>
                </div>
              </div>

              <button
                onClick={() => joinGuild(g.id)}
                disabled={g.memberCount >= g.maxMembers}
                className={cn(
                  'w-full py-2 rounded-lg font-semibold transition-all',
                  g.memberCount >= g.maxMembers
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'btn-primary'
                )}
              >
                {g.memberCount >= g.maxMembers ? '已满员' : '申请加入'}
              </button>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="card w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-400" />
                  创建公会
                </h3>
                <p className="text-sm text-gray-400 mb-4">创建需要 10,000 金币</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">公会名称 *</label>
                    <input
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="input"
                      placeholder="请输入公会名称"
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">公会标签</label>
                    <input
                      value={createForm.tag}
                      onChange={(e) => setCreateForm({ ...createForm, tag: e.target.value.toUpperCase() })}
                      className="input"
                      placeholder="如: TSG (最多5字符)"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">公会简介</label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      className="input resize-none h-24"
                      placeholder="介绍一下你的公会吧..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">
                    取消
                  </button>
                  <button onClick={createGuild} className="btn-primary flex-1">
                    创建 (10,000金币)
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const isLeader = guild.leaderId === player?.id;
  const expForNext = Math.floor(10000 * Math.pow(guild.level, 2));
  const expPercent = (guild.exp / expForNext) * 100;

  return (
    <div className="space-y-6">
      <div className="card bg-gradient-to-br from-dark-800 via-blue-900/20 to-dark-800">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">
                {guild.tag && <span className="text-time-400 mr-2">[{guild.tag}]</span>}
                {guild.name}
              </h2>
              <p className="text-gray-400 mb-2">{guild.description}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-yellow-400">
                  <Crown className="w-4 h-4" /> Lv.{guild.level}
                </span>
                <span className="flex items-center gap-1 text-purple-400">
                  <Star className="w-4 h-4" /> {formatNumber(guild.reputation)} 声望
                </span>
                <span className="flex items-center gap-1 text-green-400">
                  <Users className="w-4 h-4" /> {guild.memberCount}/{guild.maxMembers}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={contributeGold} className="btn-secondary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              贡献
            </button>
            {!isLeader && (
              <button onClick={leaveGuild} className="btn-danger flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                退出
              </button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">升级进度</span>
            <span className="text-gray-400">{formatNumber(guild.exp)} / {formatNumber(expForNext)}</span>
          </div>
          <div className="w-full h-3 bg-dark-600 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${expPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-time-400" />
              公会建筑
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(guild.buildings || []).map((b) => (
                <div key={b.id} className="bg-dark-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{b.name}</h4>
                      <p className="text-sm text-gray-400">Lv.{b.level}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-time-500/20 to-purple-500/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-time-400" />
                    </div>
                  </div>

                  <div className="space-y-1 text-sm mb-3">
                    {Object.entries(b.bonuses || {}).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-gray-400">
                          {k === 'craftBonus' ? '合成加成' :
                           k === 'dungeonBonus' ? '副本加成' :
                           k === 'specialEffectBonus' ? '特效加成' :
                           k === 'fragmentCapacity' ? '碎片容量' :
                           k === 'sandglassCapacity' ? '沙漏容量' :
                           k === 'craftSpeed' ? '合成速度' :
                           k === 'expBonus' ? '经验加成' : k}
                        </span>
                        <span className="text-green-400 font-medium">
                          +{Math.round((v as number) * (k.includes('Capacity') ? 1 : 100))}
                          {k.includes('Capacity') ? '' : '%'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {isLeader && (
                    <div className="border-t border-dark-600 pt-3 mt-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-400">升级费用</span>
                        <span className="text-yellow-400">{formatNumber(b.upgradeRequiredGold)} 金币</span>
                      </div>
                      <button
                        onClick={() => upgradeBuilding(b.id)}
                        disabled={guild.gold < (b.upgradeRequiredGold || 0)}
                        className={cn(
                          'w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-all',
                          guild.gold >= (b.upgradeRequiredGold || 0)
                            ? 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white'
                            : 'bg-dark-600 text-gray-500 cursor-not-allowed'
                        )}
                      >
                        <ArrowUp className="w-4 h-4" />
                        升级
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              成员列表 ({guild.memberCount})
            </h3>
            <div className="space-y-2">
              {(guild.members || []).map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-time-500 to-purple-500 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{m.playerId?.substring(0, 8) || '成员'}</p>
                      <p className="text-xs text-gray-400">
                        {m.role === 'leader' ? '👑 会长' :
                         m.role === 'officer' ? '⭐ 官员' :
                         m.role === 'veteran' ? '💎 资深' :
                         m.role === 'member' ? '成员' : '新兵'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-400">{formatNumber(m.totalContribution || 0)}</p>
                    <p className="text-xs text-gray-400">总贡献</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              公会金库
            </h3>
            <p className="text-4xl font-bold text-yellow-400 mb-4">{formatNumber(guild.gold)}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">合成加成</span>
                <span className="text-green-400 font-bold">+{Math.round(((guild.craftBonus || 1) - 1) * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">副本加成</span>
                <span className="text-green-400 font-bold">+{Math.round(((guild.dungeonBonus || 1) - 1) * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              我的贡献
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">本周贡献</p>
                <p className="text-2xl font-bold text-time-300">
                  {formatNumber(guild.members?.find((m: any) => m.playerId === player?.id)?.weeklyContribution || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">累计贡献</p>
                <p className="text-2xl font-bold text-purple-300">
                  {formatNumber(guild.members?.find((m: any) => m.playerId === player?.id)?.totalContribution || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-time-400" />
              加成说明
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <Hammer className="w-4 h-4 text-time-400" />
                <span>时光塔提升合成成功率</span>
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>研究厅提升特殊词缀概率</span>
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span>副本收益全体成员共享</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
