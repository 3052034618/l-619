import { useEffect, useState } from 'react';
import api from '../services/api';
import {
  FileBarChart,
  Download,
  TrendingUp,
  Users,
  Hammer,
  Map,
  Swords,
  ShoppingBag,
  Map as MapIcon,
  BarChart3,
  LineChart as LineChartIcon,
  Target,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { formatNumber, QUALITY_LABELS, ERA_LABELS } from '../utils';

export default function Reports() {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const res = await api.get('/reports/weekly');
      setReports(res.data?.data?.items || []);
      if (res.data?.data?.items?.[0]) {
        setSelectedReport(res.data.data.items[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/reports/weekly/generate');
      if (res.data.success) {
        setSelectedReport(res.data.data);
        loadReports();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const exportPDF = async () => {
    if (!selectedReport) return;
    try {
      const res = await api.get(`/reports/weekly/${selectedReport.id}/export`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `weekly-report-${selectedReport.weekNumber}.pdf`;
      link.click();
    } catch (error: any) {
      alert(error.response?.data?.error || '导出失败');
    }
  };

  const heatmapData = selectedReport?.dungeonHeatmap || [];
  const craftData = selectedReport?.craftSuccessRates || [];
  const radarData = selectedReport?.temporalRadar
    ? [
        { subject: '时光掌控', A: selectedReport.temporalRadar.temporalControl || 0, fullMark: 100 },
        { subject: '特殊效果', A: selectedReport.temporalRadar.specialEffect || 0, fullMark: 100 },
        { subject: 'PVP实力', A: selectedReport.temporalRadar.pvpPower || 0, fullMark: 100 },
        { subject: '收藏价值', A: selectedReport.temporalRadar.collectionValue || 0, fullMark: 100 },
        { subject: '副本效率', A: selectedReport.temporalRadar.dungeonEfficiency || 0, fullMark: 100 },
      ]
    : [];

  if (loading) return <div className="text-center text-gray-400 py-20">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="w-7 h-7 text-purple-400" />
            时光产业报告
          </h2>
          <p className="text-gray-400 mt-1">每周全服数据统计与分析</p>
        </div>
        <div className="flex gap-3">
          <button onClick={generateReport} disabled={generating} className="btn-secondary flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {generating ? '生成中...' : '生成周报'}
          </button>
          {selectedReport && (
            <button onClick={exportPDF} className="btn-primary flex items-center gap-2">
              <Download className="w-5 h-5" />
              导出PDF
            </button>
          )}
        </div>
      </div>

      {reports.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4">历史报告</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedReport(r)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedReport?.id === r.id
                    ? 'bg-time-600 text-white'
                    : 'bg-dark-700 text-gray-400 hover:text-white'
                }`}
              >
                第 {r.weekNumber} 周 ({r.year})
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedReport ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { icon: Users, label: '活跃玩家', value: formatNumber(selectedReport.activePlayers || 0), color: 'text-blue-400' },
              { icon: Hammer, label: '合成次数', value: formatNumber(selectedReport.totalCrafts || 0), color: 'text-time-400' },
              { icon: Map, label: '副本探索', value: formatNumber(selectedReport.totalDungeonRuns || 0), color: 'text-green-400' },
              { icon: Swords, label: '联赛场次', value: formatNumber(selectedReport.totalLeagueMatches || 0), color: 'text-red-400' },
              { icon: ShoppingBag, label: '交易总额', value: formatNumber(selectedReport.totalTradeVolume || 0), color: 'text-yellow-400' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card text-center"
              >
                <stat.icon className={`w-8 h-8 mx-auto mb-2 ${stat.color}`} />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-green-400" />
                副本热度分布
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={heatmapData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="dungeonName" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="plays" name="探索次数" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="clears" name="通关次数" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-time-400" />
                全服时光能量雷达
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="subject" stroke="#9CA3AF" />
                    <PolarRadiusAxis stroke="#374151" />
                    <Radar
                      name="全服平均"
                      dataKey="A"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.5}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <LineChartIcon className="w-5 h-5 text-green-400" />
                合成成功率曲线
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={craftData.map((d: any) => ({
                    ...d,
                    ratePercent: (d.rate * 100).toFixed(1),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="quality" stroke="#9CA3AF" tickFormatter={(v) => QUALITY_LABELS[v] || v} />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ratePercent"
                      name="成功率(%)"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ fill: '#10B981', r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                本周最佳沙漏
              </h3>
              <div className="space-y-3">
                {(selectedReport.topSandglasses || []).slice(0, 5).map((s: any, i: number) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-3 bg-dark-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        i === 0 ? 'bg-yellow-500 text-yellow-900' :
                        i === 1 ? 'bg-gray-400 text-gray-900' :
                        i === 2 ? 'bg-orange-600 text-orange-100' :
                        'bg-dark-600 text-gray-400'
                      }`}>
                        #{i + 1}
                      </span>
                      <div>
                        <p className="font-semibold" style={{ color: `hsl(${280 - i * 30}, 70%, 60%)` }}>
                          {s.name}
                        </p>
                        <p className="text-xs text-gray-400">{QUALITY_LABELS[s.rarity] || s.rarity}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-time-300">⚡ {formatNumber(s.temporalControl)}</p>
                      <p className="text-xs text-gray-400">收藏 {formatNumber(s.collectionValue)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-20">
          <FileBarChart className="w-16 h-16 mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400 mb-4">暂无周报数据</p>
          <button onClick={generateReport} className="btn-primary">
            生成第一份周报
          </button>
        </div>
      )}
    </div>
  );
}
