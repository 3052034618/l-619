import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Clock, User, Lock, Edit3 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '', nickname: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (form.password.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    const success = await register(form.username, form.password, form.nickname || undefined);
    if (success) {
      navigate('/');
    } else {
      setError('注册失败，用户名可能已存在');
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-sand-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -50, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="card text-center">
          <div className="flex justify-center mb-6">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-sand-500 to-time-500 flex items-center justify-center"
            >
              <Clock className="w-10 h-10 text-white" />
            </motion.div>
          </div>

          <h1 className="text-3xl font-bold bg-gradient-to-r from-sand-300 to-time-300 bg-clip-text text-transparent mb-2">
            创建账号
          </h1>
          <p className="text-gray-400 mb-8">开始你的时光冒险之旅</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2 text-left">用户名 *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="input pl-10"
                  placeholder="3-50字符"
                  required
                  minLength={3}
                  maxLength={50}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2 text-left">昵称</label>
              <div className="relative">
                <Edit3 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  className="input pl-10"
                  placeholder="可选"
                  maxLength={50}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2 text-left">密码 *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input pl-10"
                  placeholder="至少6位"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2 text-left">确认密码 *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="input pl-10"
                  placeholder="再次输入密码"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-sm"
              >
                {error}
              </motion.p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={isLoading}>
              {isLoading ? '注册中...' : '创建账号'}
            </button>
          </form>

          <p className="mt-6 text-gray-400 text-sm">
            已有账号？
            <button
              onClick={() => navigate('/login')}
              className="text-time-400 hover:text-time-300 ml-1 font-medium"
            >
              返回登录
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
