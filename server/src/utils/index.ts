import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { QUALITY_MULTIPLIER, QUALITY_ORDER, ERA_ORDER } from '../types';

export function generateId(): string {
  return uuidv4();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: Record<string, any>): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function weightedRandomChoice<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getQualityIndex(quality: string): number {
  return QUALITY_ORDER.indexOf(quality);
}

export function getEraIndex(era: string): number {
  return ERA_ORDER.indexOf(era);
}

export function getQualityMultiplier(quality: string): number {
  return QUALITY_MULTIPLIER[quality] || 1;
}

export function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toString();
}

export function calculateRarityFromScore(score: number): string {
  if (score >= 5000) return 'mythical';
  if (score >= 3000) return 'legendary';
  if (score >= 1500) return 'epic';
  if (score >= 700) return 'rare';
  if (score >= 300) return 'uncommon';
  return 'common';
}

export function calculateMasteryLevel(mastery: number): number {
  return Math.floor(Math.sqrt(mastery / 100)) + 1;
}

export function getExpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
