import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const QUALITY_COLORS: Record<string, string> = {
  common: '#9CA3AF',
  uncommon: '#10B981',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
  mythical: '#EF4444',
};

export const QUALITY_LABELS: Record<string, string> = {
  common: '普通',
  uncommon: '优秀',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
  mythical: '神话',
};

export const ERA_LABELS: Record<string, string> = {
  ancient: '远古',
  medieval: '中世纪',
  renaissance: '文艺复兴',
  modern: '近代',
  future: '未来',
  mythical: '神话',
};

export const QUALITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];

export function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toString();
}

export function calculateMasteryLevel(mastery: number): number {
  return Math.floor(Math.sqrt(mastery / 100)) + 1;
}
