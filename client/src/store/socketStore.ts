import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './authStore';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  notifications: any[];
  dungeonState: any | null;
  matchState: any | null;
  connect: () => void;
  disconnect: () => void;
  addNotification: (notification: any) => void;
  clearNotifications: () => void;
  joinDungeon: (sessionId: string) => void;
  leaveDungeon: (sessionId: string) => void;
  joinMatch: (matchId: string) => void;
  leaveMatch: (matchId: string) => void;
  updatePosition: (sessionId: string, x: number, y: number, z: number, hp?: number) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  notifications: [],
  dungeonState: null,
  matchState: null,

  connect: () => {
    if (get().socket && get().isConnected) return;

    const token = useAuthStore.getState().token;
    const socket = io({
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      set({ isConnected: true });
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
      console.log('Socket disconnected');
    });

    socket.on('dungeon:state', (state) => {
      set({ dungeonState: state });
    });

    socket.on('dungeon:fragment_collected', (data) => {
      get().addNotification({ type: 'fragment', data, message: '收集到新碎片！' });
    });

    socket.on('dungeon:dungeon_event', (event) => {
      get().addNotification({ type: 'event', data: event, message: event.data?.message || '副本事件' });
    });

    socket.on('dungeon:session_ended', (data) => {
      get().addNotification({ type: 'dungeon_end', data, message: `副本${data.status === 'completed' ? '通关！' : '失败'}` });
      set({ dungeonState: null });
    });

    socket.on('dungeon:time_ripple', (data) => {
      get().addNotification({ type: 'ripple', data, message: data.message });
    });

    socket.on('league:match_found', (data) => {
      get().addNotification({ type: 'match', data, message: '找到对手！' });
    });

    socket.on('league:state', (state) => {
      set({ matchState: state });
    });

    socket.on('league:skill_used', (data) => {
      get().addNotification({ type: 'skill', data, message: `${data.skillName} 释放！` });
    });

    socket.on('league:match_result', (data) => {
      get().addNotification({ type: 'match_end', data, message: `比赛${data.result === 'win' ? '胜利！' : '失败'}` });
      set({ matchState: null });
    });

    socket.on('trade:announcement', (data) => {
      get().addNotification({ type: 'trade', data, message: data.message });
    });

    socket.on('chat:message', (data) => {
      get().addNotification({ type: 'chat', data, message: `${data.playerId}: ${data.message}` });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id: Date.now() + Math.random(), timestamp: Date.now() },
      ].slice(-50),
    }));
  },

  clearNotifications: () => set({ notifications: [] }),

  joinDungeon: (sessionId) => {
    get().socket?.emit('dungeon:join', { sessionId });
  },

  leaveDungeon: (sessionId) => {
    get().socket?.emit('dungeon:leave', { sessionId });
    set({ dungeonState: null });
  },

  joinMatch: (matchId) => {
    get().socket?.emit('match:join', { matchId });
  },

  leaveMatch: (matchId) => {
    get().socket?.emit('match:leave', { matchId });
    set({ matchState: null });
  },

  updatePosition: (sessionId, x, y, z, hp) => {
    get().socket?.emit('dungeon:position', { sessionId, x, y, z, hp });
  },
}));
