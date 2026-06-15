import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import {
  ShoppingBag,
  Search,
  Tag,
  Coins,
  Filter,
  ListPlus,
  Check,
  X,
  TrendingUp,
  Sparkles,
  Bell,
  BellOff,
  Star,
  Target,
  Edit3,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { QUALITY_COLORS, QUALITY_LABELS, ERA_LABELS, formatNumber, cn } from '../utils';

enum TradeItemType {
  FRAGMENT = 'fragment',
  SANDGLASS = 'sandglass',
}

interface TradeItem {
  id: string;
  sellerId: string;
  sellerName: string;
  itemType: string;
  itemId: string;
  itemName: string;
  itemEra: string;
  itemQuality: string;
  itemDetails: Record<string, any>;
  price: number;
  suggestedPrice: number;
  avg7dPrice: number;
  createdAt: string;
}

interface WatchItem {
  id: string;
  itemType: string;
  itemQuality: string;
  itemEra: string;
  itemName?: string;
  targetPrice: number;
  avg7dPrice: number;
  currentLowestPrice: number;
  isBelowTarget: boolean;
  notifyEnabled: boolean;
  createdAt: string;
}

export default function Trade() {
  const { player } = useAuthStore();
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    itemType: 'all',
    quality: 'all',
    era: 'all',
    minPrice: '',
    maxPrice: '',
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  });
  const [showListModal, setShowListModal] = useState(false);
  const [listForm, setListForm] = useState({
    itemType: TradeItemType.FRAGMENT,
    itemId: '',
    price: '',
  });
  const [priceTrend, setPriceTrend] = useState<any[]>([]);
  const [trendFilters, setTrendFilters] = useState({
    itemType: 'fragment',
    quality: 'rare',
    era: 'all',
  });
  const [activeTab, setActiveTab] = useState<'market' | 'my' | 'trend' | 'watch'>('market');
  const [myItems, setMyItems] = useState<any[]>([]);
  const [showWatchModal, setShowWatchModal] = useState(false);
  const [watchTarget, setWatchTarget] = useState<any>(null);
  const [targetPriceInput, setTargetPriceInput] = useState('');
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  useEffect(() => {
    loadTrades();
    if (activeTab === 'watch') {
      loadWatchlist();
    }
  }, [filters, activeTab]);

  useEffect(() => {
    if (activeTab === 'watch') {
      loadWatchlist();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'trend') {
      loadPriceTrend();
    }
  }, [trendFilters, activeTab]);

  const loadWatchlist = async () => {
    setWatchlistLoading(true);
    try {
      const res = await api.get('/trades/watchlist');
      if (res.data?.success) {
        setWatchlist(res.data.data || []);
      }
    } finally {
      setWatchlistLoading(false);
    }
  };

  const openWatchModal = (trade?: any, isEdit: boolean = false) => {
    if (isEdit) {
      setWatchTarget(trade);
      setTargetPriceInput(String(trade.targetPrice || ''));
    } else {
      setWatchTarget(trade);
      const basePrice = trade.suggestedPrice || 100;
      setTargetPriceInput(String(Math.floor(basePrice * 0.8)));
    }
    setShowWatchModal(true);
  };

  const handleAddWatch = async () => {
    if (!watchTarget || !targetPriceInput) return;
    try {
      const res = await api.post('/trades/watchlist', {
        itemType: watchTarget.itemType,
        quality: watchTarget.itemQuality,
        era: watchTarget.itemEra || 'all',
        targetPrice: Number(targetPriceInput),
        itemName: watchTarget.itemName,
      });
      if (res.data?.success) {
        alert('关注成功！价格低于目标价时会通知您');
        setShowWatchModal(false);
        if (activeTab === 'watch') loadWatchlist();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || '关注失败');
    }
  };

  const handleUpdateWatch = async () => {
    if (!watchTarget?.id || !targetPriceInput) return;
    try {
      const res = await api.put(`/trades/watchlist/${watchTarget.id}`, {
        targetPrice: Number(targetPriceInput),
      });
      if (res.data?.success) {
        alert('目标价已更新');
        setShowWatchModal(false);
        loadWatchlist();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || '更新失败');
    }
  };

  const handleRemoveWatch = async (watchId: string) => {
    if (!confirm('确定取消关注？')) return;
    try {
      await api.delete(`/trades/watchlist/${watchId}?v1');
      alert('已取消关注');
      loadWatchlist();
    } catch (err: any) {
      alert(err.response?.data?.error || '取消失败');
    }
  };

  const loadPriceTrend = async () => {
    try {
      const params = new URLSearchParams();
      params.set('itemType', trendFilters.itemType);
      params.set('quality', trendFilters.quality);
      const res = await api.get(`/trades/price-trend?${params}`);
      const rawData = res.data?.data || [];
      if (Array.isArray(rawData) && rawData.length > 0) {
        setPriceTrend(rawData);
      } else {
        const fallback = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const basePrice = (trendFilters.itemType === 'fragment' ? 100 : 1000) *
            (['common','uncommon','rare','epic','legendary','mythical'].indexOf(trendFilters.quality) + 1) * 2;
          fallback.push({
            date: d.toISOString().split('T')[0],
            avgPrice: basePrice + Math.random() * basePrice * 0.5,
            volume: Math.floor(Math.random() * 30) + 5,
          });
        }
        setPriceTrend(fallback);
      }
    } catch {
      const fallback = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        fallback.push({
          date: d.toISOString().split('T')[0],
          avgPrice: 500 + Math.random() * 200,
          volume: Math.floor(Math.random() * 20) + 2,
        });
      }
      setPriceTrend(fallback);
    }
  };

  const loadTrades = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.itemType !== 'all') params.set('itemType', filters.itemType);
      if (filters.quality !== 'all') params.set('quality', filters.quality);
      if (filters.era !== 'all') params.set('era', filters.era);
      if (filters.minPrice) params.set('minPrice', filters.minPrice);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
      params.set('sortBy', filters.sortBy);
      params.set('sortOrder', filters.sortOrder);
      params.set('pageSize', '50');

      const res = await api.get(`/trades?${params}`);
      setTrades(res.data?.data?.items || []);

      if (activeTab === 'my') {
        setMyItems((res.data?.data?.items || []).filter((t: TradeItem) => t.sellerId === player?.id));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (tradeId: string) => {
    if (!confirm('确定购买该物品？')) return;
    try {
      await api.post(`/trades/${tradeId}/buy`);
      alert('购买成功！');
      loadTrades();
    } catch (error: any) {
      alert(error.response?.data?.error || '购买失败');
    }
  };

  const handleCancel = async (tradeId: string) => {
    try {
      await api.post(`/trades/${tradeId}/cancel`);
      loadTrades();
    } catch (error: any) {
      alert(error.response?.data?.error || '取消失败');
    }
  };

  const handleList = async () => {
    if (!listForm.itemId || !listForm.price) {
      alert('请填写完整信息');
      return;
    }
    try {
      await api.post('/trades/list', {
        itemType: listForm.itemType,
        itemId: listForm.itemId,
        price: Number(listForm.price),
      });
      setShowListModal(false);
      setListForm({ itemType: TradeItemType.FRAGMENT, itemId: '', price: '' });
      loadTrades();
    } catch (error: any) {
      alert(error.response?.data?.error || '上架失败');
    }
  };

  const displayTrades = activeTab === 'my' ? myItems : trades;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-yellow-400" />
            交易市场
          </h2>
          <p className="text-gray-400 mt-1">买卖沙漏和碎片，触发时间涟漪</p>
        </div>
        <button onClick={() => setShowListModal(true)} className="btn-primary flex items-center gap-2">
          <ListPlus className="w-5 h-5" />
          上架物品
        </button>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        {(['market', 'my', 'trend', 'watch'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2',
              activeTab === tab
                ? 'bg-time-600 text-white'
                : 'bg-dark-700 text-gray-400 hover:text-white'
            )}
          >
            {tab === 'market' && <><ShoppingBag className="w-4 h-4" /> 市场</>}
            {tab === 'my' && <><Tag className="w-4 h-4" /> 我的上架</>}
            {tab === 'trend' && <><TrendingUp className="w-4 h-4" /> 价格走势</>}
            {tab === 'watch' && <><Bell className="w-4 h-4" /> 关注清单</>}
          </button>
        ))}
      </div>

      {activeTab === 'trend' ? (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              交易价格走势
            </h3>
            <div className="flex items-center gap-3">
              <select
                value={trendFilters.itemType}
                onChange={(e) => setTrendFilters({ ...trendFilters, itemType: e.target.value })}
                className="input w-28"
              >
                <option value="fragment">碎片</option>
                <option value="sandglass">沙漏</option>
              </select>
              <select
                value={trendFilters.quality}
                onChange={(e) => setTrendFilters({ ...trendFilters, quality: e.target.value })}
                className="input w-28"
              >
                {['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'].map((q) => (
                  <option key={q} value={q}>{QUALITY_LABELS[q]}</option>
                ))}
              </select>
              <select
                value={trendFilters.era}
                onChange={(e) => setTrendFilters({ ...trendFilters, era: e.target.value })}
                className="input w-28"
              >
                <option value="all">全部时代</option>
                {['ancient', 'medieval', 'renaissance', 'modern', 'future'].map((e) => (
                  <option key={e} value={e}>{ERA_LABELS[e]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-400 mb-3 flex items-center gap-4">
            <span>当前：{trendFilters.itemType === 'fragment' ? '碎片' : '沙漏'} · {QUALITY_LABELS[trendFilters.quality]} · {trendFilters.era === 'all' ? '全部时代' : ERA_LABELS[trendFilters.era]}</span>
            {priceTrend.some((d: any) => d.avgPrice === 0 && d.volume === 0) && (
              <span className="text-yellow-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> 部分日期无成交，显示参考价
              </span>
            )}
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceTrend || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  yAxisId="left"
                  label={{ value: '均价（金币）', angle: -90, position: 'insideLeft', fill: '#F59E0B', fontSize: 12 }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  yAxisId="right"
                  orientation="right"
                  label={{ value: '成交量', angle: 90, position: 'insideRight', fill: '#8B5CF6', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: any, name: string) => {
                    if (name === 'avgPrice') return [value > 0 ? formatNumber(Number(value)) : '无成交', '均价'];
                    if (name === 'referencePrice') return [formatNumber(Number(value)), '参考价'];
                    if (name === 'volume') return [value, '成交量'];
                    return [value, name];
                  }}
                />
                <Legend
                  formatter={(value: string) => {
                    if (value === 'avgPrice') return '均价';
                    if (value === 'referencePrice') return '参考价';
                    if (value === 'volume') return '成交量';
                    return value;
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avgPrice"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  dot={{ fill: '#F59E0B', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="avgPrice"
                  connectNulls
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="referencePrice"
                  stroke="#9CA3AF"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                  name="referencePrice"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="volume"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#8B5CF6', r: 3 }}
                  name="volume"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : activeTab === 'watch' ? (
        <div className="card">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-400" />
            我的关注清单
          </h3>
          {watchlistLoading ? (
            <p className="text-gray-400 text-center py-8">加载中...</p>
          ) : watchlist.length === 0 ? (
            <div className="text-center py-12">
              <BellOff className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">暂无关注物品</p>
              <p className="text-gray-500 text-sm mt-1">点击商品卡片的铃铛图标即可关注，价格低于目标价时会收到提醒</p>
            </div>
          ) : (
            <div className="space-y-3">
              {watchlist.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'p-4 rounded-xl border transition-all',
                    item.isBelowTarget
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-dark-700/50 border-dark-600 hover:bg-dark-700'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-semibold quality-' + item.itemQuality,
                          'quality-bg-' + item.itemQuality
                        )}>
                          {QUALITY_LABELS[item.itemQuality as keyof typeof QUALITY_LABELS]}
                        </span>
                        <span className="text-sm text-gray-400">
                          {item.itemType === 'fragment' ? '碎片' : '沙漏'}
                          {item.itemEra !== 'all' && ` · ${ERA_LABELS[item.itemEra as keyof typeof ERA_LABELS]}`}
                        </span>
                        {item.isBelowTarget && (
                          <span className="text-green-400 text-xs font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> 低于目标价
                          </span>
                        )}
                      </div>
                      <p className="font-semibold truncate">
                        {item.itemName || `${item.itemType === 'fragment' ? '碎片' : '沙漏'} · ${QUALITY_LABELS[item.itemQuality as keyof typeof QUALITY_LABELS]}`}
                      </p>
                      <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-gray-400 text-xs">7日均价</p>
                          <p className="text-time-300 font-bold">{item.avg7dPrice > 0 ? formatNumber(item.avg7dPrice) : '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">当前最低</p>
                          <p className={cn(
                            'font-bold',
                            item.isBelowTarget ? 'text-green-400' : 'text-yellow-400'
                          )}>
                            {item.currentLowestPrice > 0 ? formatNumber(item.currentLowestPrice) : '暂无'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">目标价</p>
                          <p className="text-purple-400 font-bold flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {formatNumber(item.targetPrice)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => openWatchModal(item, true)}
                        className="p-2 rounded-lg bg-dark-600 hover:bg-dark-500 text-gray-400 hover:text-blue-400 transition-all"
                        title="修改目标价"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveWatch(item.id)}
                        className="p-2 rounded-lg bg-dark-600 hover:bg-dark-500 text-gray-400 hover:text-red-400 transition-all"
                        title="取消关注"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="card">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  className="input pl-10"
                  placeholder="搜索物品..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filters.itemType}
                  onChange={(e) => setFilters({ ...filters, itemType: e.target.value })}
                  className="input w-32"
                >
                  <option value="all">全部类型</option>
                  <option value="fragment">碎片</option>
                  <option value="sandglass">沙漏</option>
                </select>
              </div>

              <select
                value={filters.quality}
                onChange={(e) => setFilters({ ...filters, quality: e.target.value })}
                className="input w-32"
              >
                <option value="all">全部品质</option>
                {['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'].map((q) => (
                  <option key={q} value={q}>{QUALITY_LABELS[q]}</option>
                ))}
              </select>

              <select
                value={filters.era}
                onChange={(e) => setFilters({ ...filters, era: e.target.value })}
                className="input w-32"
              >
                <option value="all">全部时代</option>
                {['ancient', 'medieval', 'renaissance', 'modern', 'future', 'mythical'].map((e) => (
                  <option key={e} value={e}>{ERA_LABELS[e]}</option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="最低价"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  className="input w-28"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="最高价"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  className="input w-28"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <p className="text-gray-400 text-center col-span-full py-20">加载中...</p>
            ) : displayTrades.length === 0 ? (
              <p className="text-gray-400 text-center col-span-full py-20">
                {activeTab === 'my' ? '暂无上架物品' : '暂无商品'}
              </p>
            ) : (
              displayTrades.map((trade, i) => {
                const isMyItem = trade.sellerId === player?.id;
                const belowAvg = trade.avg7dPrice > 0 && trade.price < trade.avg7dPrice;
                return (
                  <motion.div
                    key={trade.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn(
                      'card quality-bg-' + trade.itemQuality,
                      'border quality-' + trade.itemQuality
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold" style={{ color: QUALITY_COLORS[trade.itemQuality] }}>
                          {trade.itemName}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {trade.itemType === 'fragment' ? '碎片' : '沙漏'} · {QUALITY_LABELS[trade.itemQuality]} · {ERA_LABELS[trade.itemEra]}
                        </p>
                      </div>
                      {belowAvg && (
                        <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                          <Sparkles className="w-3 h-3" /> 低于均价
                        </span>
                      )}
                    </div>

                    {trade.itemDetails?.attributes && (
                      <div className="text-xs text-gray-400 mb-3">
                        {Object.entries(trade.itemDetails.attributes).map(([k, v]) => (
                          <span key={k} className="mr-2">{k}: {v as number}</span>
                        ))}
                      </div>
                    )}

                    <div className="bg-dark-700 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">卖家</span>
                        <span>{trade.sellerName}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-gray-400">7日均价</span>
                        <span className="text-sm">{trade.avg7dPrice > 0 ? formatNumber(trade.avg7dPrice) : '暂无'}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-gray-400">建议价</span>
                        <span className="text-sm">{formatNumber(trade.suggestedPrice)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-yellow-400" />
                        <span className="text-2xl font-bold text-yellow-400">{formatNumber(trade.price)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openWatchModal(trade); }}
                          className="p-2 rounded-lg bg-dark-600 hover:bg-dark-500 text-gray-400 hover:text-yellow-400 transition-all"
                          title="关注"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                        {isMyItem ? (
                          <button onClick={() => handleCancel(trade.id)} className="btn-danger text-sm py-1.5 px-4">
                            <X className="w-4 h-4 mr-1 inline" /> 取消
                          </button>
                        ) : (
                          <button onClick={() => handleBuy(trade.id)} className="btn-primary text-sm py-1.5 px-4">
                            <Check className="w-4 h-4 mr-1 inline" /> 购买
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {showListModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowListModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="card w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-yellow-400" />
                上架物品
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">物品类型</label>
                  <select
                    value={listForm.itemType}
                    onChange={(e) => setListForm({ ...listForm, itemType: e.target.value as TradeItemType, itemId: '' })}
                    className="input w-full"
                  >
                    <option value={TradeItemType.FRAGMENT}>碎片</option>
                    <option value={TradeItemType.SANDGLASS}>沙漏</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">选择物品</label>
                  <select
                    value={listForm.itemId}
                    onChange={(e) => setListForm({ ...listForm, itemId: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">请选择物品</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">售价 (金币)</label>
                  <input
                    type="number"
                    value={listForm.price}
                    onChange={(e) => setListForm({ ...listForm, price: e.target.value })}
                    className="input"
                    placeholder="请输入价格"
                    min={1}
                  />
                </div>

                <div className="bg-dark-700 rounded-lg p-3 text-sm text-gray-400">
                  <p>💡 提示：系统会根据近7天成交均价给出合理的价格建议区间。稀有物品交易会触发全服时间涟漪事件！</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowListModal(false)} className="btn-secondary flex-1">
                  取消
                </button>
                <button onClick={handleList} className="btn-primary flex-1">
                  确认上架
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showWatchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowWatchModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="card w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-400" />
                {watchTarget?.id ? '修改目标价' : '设置关注'}
              </h3>

              {watchTarget && (
                <div className="space-y-4">
                  <div className="bg-dark-700/50 rounded-lg p-3">
                    <p className="font-semibold">
                      {watchTarget.itemName || `${watchTarget.itemType === 'fragment' ? '碎片' : '沙漏'} · ${QUALITY_LABELS[watchTarget.itemQuality as keyof typeof QUALITY_LABELS]}`}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {watchTarget.itemType === 'fragment' ? '碎片' : '沙漏'}
                      {' · '}
                      {QUALITY_LABELS[watchTarget.itemQuality as keyof typeof QUALITY_LABELS]}
                      {watchTarget.itemEra && watchTarget.itemEra !== 'all' && ` · ${ERA_LABELS[watchTarget.itemEra as keyof typeof ERA_LABELS]}`}
                    </p>
                    {watchTarget.currentLowestPrice > 0 && (
                      <p className="text-sm mt-2">
                        当前最低价：<span className="text-yellow-400 font-bold">{formatNumber(watchTarget.currentLowestPrice)}</span> 金币
                      </p>
                    )}
                    {watchTarget.avg7dPrice > 0 && (
                      <p className="text-sm">
                        7日均价：<span className="text-time-400 font-bold">{formatNumber(watchTarget.avg7dPrice)}</span> 金币
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      目标提醒价 (金币)
                    </label>
                    <input
                      type="number"
                      value={targetPriceInput}
                      onChange={(e) => setTargetPriceInput(e.target.value)}
                      className="input"
                      placeholder="低于此价格时提醒我"
                      min={1}
                    />
                    <p className="text-xs text-gray-500 mt-1">当该品质物品有玩家以低于或等于此价格出售时，您会收到通知</p>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setShowWatchModal(false)} className="btn-secondary flex-1">
                      取消
                    </button>
                    <button
                      onClick={watchTarget?.id ? handleUpdateWatch : handleAddWatch}
                      className="btn-primary flex-1"
                      disabled={!targetPriceInput || Number(targetPriceInput) <= 0}
                    >
                      {watchTarget?.id ? '保存修改' : '添加关注'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
