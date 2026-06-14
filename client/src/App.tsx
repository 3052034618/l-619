import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSocketStore } from './store/socketStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Workshop from './pages/Workshop';
import DungeonList from './pages/DungeonList';
import DungeonSession from './pages/DungeonSession';
import League from './pages/League';
import Trade from './pages/Trade';
import Guild from './pages/Guild';
import Achievements from './pages/Achievements';
import Reports from './pages/Reports';
import Leaderboard from './pages/Leaderboard';
import PlayerProfile from './pages/PlayerProfile';

function App() {
  const { isAuthenticated, token, fetchMe } = useAuthStore();
  const { connect, disconnect } = useSocketStore();

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchMe();
      connect();
    }
    return () => {
      disconnect();
    };
  }, [isAuthenticated, token]);

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
      <Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/workshop" element={<Workshop />} />
        <Route path="/dungeons" element={<DungeonList />} />
        <Route path="/dungeons/:sessionId" element={<DungeonSession />} />
        <Route path="/league" element={<League />} />
        <Route path="/trade" element={<Trade />} />
        <Route path="/guild" element={<Guild />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/player/:id" element={<PlayerProfile />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
    </Routes>
  );
}

export default App;
