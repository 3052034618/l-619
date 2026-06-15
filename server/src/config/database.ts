import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from './index';
import { Player } from '../entities/Player';
import { Sandglass } from '../entities/Sandglass';
import { Fragment } from '../entities/Fragment';
import { Dungeon } from '../entities/Dungeon';
import { DungeonSession } from '../entities/DungeonSession';
import { Guild } from '../entities/Guild';
import { GuildMember } from '../entities/GuildMember';
import { GuildBuilding } from '../entities/GuildBuilding';
import { Trade } from '../entities/Trade';
import { TradeWatchlist } from '../entities/TradeWatchlist';
import { LeagueMatch } from '../entities/LeagueMatch';
import { LeagueRank } from '../entities/LeagueRank';
import { WeeklyReport } from '../entities/WeeklyReport';
import { Achievement, PlayerAchievement } from '../entities/Achievement';
import { PlayerInventory } from '../entities/PlayerInventory';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: true,
  logging: process.env.NODE_ENV !== 'production',
  entities: [
    Player, Sandglass, Fragment, Dungeon, DungeonSession,
    Guild, GuildMember, GuildBuilding, Trade, TradeWatchlist, LeagueMatch,
    LeagueRank, WeeklyReport, Achievement, PlayerAchievement, PlayerInventory,
  ],
  subscribers: [],
  migrations: [],
  pool: {
    max: 50,
    min: 5,
    idleTimeoutMillis: 30000,
  },
  extra: {
    maxUses: 7500,
  },
});
