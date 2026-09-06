import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';

let db: Database | null = null;
const DB_FILE = path.join(process.cwd(), 'jockey_game.sqlite');

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Initialize Tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      display_name TEXT,
      coins INTEGER DEFAULT 100,
      jc_balance INTEGER DEFAULT 100,
      wins INTEGER DEFAULT 0,
      wins_count INTEGER DEFAULT 0,
      total_races INTEGER DEFAULT 0,
      horse_level INTEGER DEFAULT 1,
      player_level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      xp_points INTEGER DEFAULT 0,
      unlocked_skins_json TEXT DEFAULT '[1]',
      unlocked_skins TEXT DEFAULT '[1]',
      vip_status INTEGER DEFAULT 0,
      last_played_race_index INTEGER DEFAULT 0,
      total_taps INTEGER DEFAULT 0,
      total_gifts INTEGER DEFAULT 0,
      created_at INTEGER,
      last_active INTEGER
    );

    CREATE TABLE IF NOT EXISTS races (
      race_id TEXT PRIMARY KEY,
      winner_username TEXT,
      mode TEXT,
      target_lanes INTEGER,
      participants_json TEXT,
      timestamp INTEGER
    );

    CREATE TABLE IF NOT EXISTS bets (
      bet_id INTEGER PRIMARY KEY AUTOINCREMENT,
      race_id TEXT,
      username TEXT,
      lane INTEGER,
      amount INTEGER,
      won INTEGER DEFAULT 0,
      payout INTEGER DEFAULT 0,
      timestamp INTEGER
    );

    CREATE TABLE IF NOT EXISTS chat_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      message TEXT,
      command_type TEXT,
      timestamp INTEGER
    );
  `);

  // Migrate existing databases seamlessly if new columns are missing
  try {
    const existingCols = new Set<string>();
    const colStmt = db.prepare("PRAGMA table_info(users)");
    while (colStmt.step()) {
      const row = colStmt.getAsObject() as { name?: string };
      if (row.name) existingCols.add(String(row.name));
    }
    colStmt.free();

    if (!existingCols.has('player_level')) db.run("ALTER TABLE users ADD COLUMN player_level INTEGER DEFAULT 1");
    if (!existingCols.has('xp')) db.run("ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0");
    if (!existingCols.has('xp_points')) db.run("ALTER TABLE users ADD COLUMN xp_points INTEGER DEFAULT 0");
    if (!existingCols.has('wins_count')) db.run("ALTER TABLE users ADD COLUMN wins_count INTEGER DEFAULT 0");
    if (!existingCols.has('jc_balance')) db.run("ALTER TABLE users ADD COLUMN jc_balance INTEGER DEFAULT 100");
    if (!existingCols.has('unlocked_skins')) db.run("ALTER TABLE users ADD COLUMN unlocked_skins TEXT DEFAULT '[1]'");
    if (!existingCols.has('last_played_race_index')) db.run("ALTER TABLE users ADD COLUMN last_played_race_index INTEGER DEFAULT 0");

    // Sync any existing legacy values
    db.run("UPDATE users SET wins_count = wins WHERE (wins_count = 0 OR wins_count IS NULL) AND wins > 0");
    db.run("UPDATE users SET jc_balance = coins WHERE (jc_balance = 0 OR jc_balance IS NULL) AND coins > 0");
    db.run("UPDATE users SET xp_points = xp WHERE (xp_points = 0 OR xp_points IS NULL) AND xp > 0");
    db.run("UPDATE users SET unlocked_skins = unlocked_skins_json WHERE (unlocked_skins IS NULL OR unlocked_skins = '') AND unlocked_skins_json IS NOT NULL");
  } catch (mErr) {
    console.warn('Migration note:', mErr);
  }

  saveDb();
  return db;
}

export function saveDb(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite DB:', err);
  }
}

export interface SkinTierMilestone {
  tier: number;
  reqLevel: number;
  reqWins: number;
  reqJC: number;
  name: string;
}

/**
 * 12 Sequential Skin Tiers & Milestone Requirements:
 * Tier 1: Level 1 | 0 Wins | 0 JC
 * Tier 2: Level 3 | 3 Wins | 200 JC
 * Tier 3: Level 5 | 8 Wins | 500 JC
 * Tier 4: Level 8 | 15 Wins | 1,200 JC
 * Tier 5: Level 10 | 25 Wins | 2,500 JC
 * Tier 6: Level 12 | 40 Wins | 5,000 JC
 * Tier 7: Level 15 | 60 Wins | 8,000 JC
 * Tier 8: Level 18 | 85 Wins | 12,000 JC
 * Tier 9: Level 20 | 120 Wins | 20,000 JC
 * Tier 10: Level 22 | 160 Wins | 30,000 JC
 * Tier 11: Level 24 | 200 Wins | 40,000 JC
 * Tier 12: Level 25 | 250 Wins | 50,000 JC
 */
export const SKIN_TIERS: SkinTierMilestone[] = [
  { tier: 1, reqLevel: 1, reqWins: 0, reqJC: 0, name: 'Scrappy Pony' },
  { tier: 2, reqLevel: 3, reqWins: 3, reqJC: 200, name: 'Cyber-Steed' },
  { tier: 3, reqLevel: 5, reqWins: 8, reqJC: 500, name: 'Emerald Glade' },
  { tier: 4, reqLevel: 8, reqWins: 15, reqJC: 1200, name: 'Golden Majesty' },
  { tier: 5, reqLevel: 10, reqWins: 25, reqJC: 2500, name: 'Cosmic Nebula' },
  { tier: 6, reqLevel: 12, reqWins: 40, reqJC: 5000, name: 'Cyberpunk Spectre' },
  { tier: 7, reqLevel: 15, reqWins: 60, reqJC: 8000, name: 'Shadow Colt' },
  { tier: 8, reqLevel: 18, reqWins: 85, reqJC: 12000, name: 'Frostbite Stallion' },
  { tier: 9, reqLevel: 20, reqWins: 120, reqJC: 20000, name: 'Lava Charger' },
  { tier: 10, reqLevel: 22, reqWins: 160, reqJC: 30000, name: 'Crystal Vanguard' },
  { tier: 11, reqLevel: 24, reqWins: 200, reqJC: 40000, name: 'Solar Phoenix' },
  { tier: 12, reqLevel: 25, reqWins: 250, reqJC: 50000, name: 'Infinity Pegasus' },
];

/**
 * Level progression calculation from XP.
 * Players earn XP strictly by completing races (+10 XP) and winning races (+50 XP).
 */
export const LEVEL_THRESHOLDS = [
  { level: 25, xp: 16000 },
  { level: 24, xp: 13500 },
  { level: 23, xp: 11500 },
  { level: 22, xp: 9800 },
  { level: 21, xp: 8200 },
  { level: 20, xp: 6800 },
  { level: 19, xp: 5600 },
  { level: 18, xp: 4500 },
  { level: 17, xp: 3600 },
  { level: 16, xp: 2900 },
  { level: 15, xp: 2300 },
  { level: 14, xp: 1800 },
  { level: 13, xp: 1400 },
  { level: 12, xp: 1050 },
  { level: 11, xp: 800 },
  { level: 10, xp: 600 },
  { level: 9, xp: 450 },
  { level: 8, xp: 330 },
  { level: 7, xp: 230 },
  { level: 6, xp: 150 },
  { level: 5, xp: 90 },
  { level: 4, xp: 50 },
  { level: 3, xp: 25 },
  { level: 2, xp: 10 },
  { level: 1, xp: 0 },
];

export function getPlayerLevelFromXP(xp: number): number {
  for (const t of LEVEL_THRESHOLDS) {
    if (xp >= t.xp) return t.level;
  }
  return 1;
}

export interface UserRow {
  username: string;
  display_name: string;
  coins: number;
  jc_balance: number;
  wins: number;
  wins_count: number;
  total_races: number;
  horse_level: number;
  player_level: number;
  xp: number;
  xp_points: number;
  unlocked_skins_json: string;
  unlocked_skins: string;
  vip_status: number;
  last_played_race_index: number;
  total_taps: number;
  total_gifts: number;
  created_at: number;
  last_active: number;
}

export async function getUser(username: string): Promise<UserRow> {
  const database = await getDb();
  const cleanUser = username.trim().toLowerCase().replace(/^@/, '');
  
  const stmt = database.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)');
  stmt.bind([cleanUser]);
  
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as Record<string, any>;
    stmt.free();

    // Fill in defaults if any columns were null or missing
    const coins = row.coins ?? row.jc_balance ?? 250;
    const jc_balance = row.jc_balance ?? row.coins ?? 250;
    const wins = row.wins ?? row.wins_count ?? 0;
    const wins_count = row.wins_count ?? row.wins ?? 0;
    const xp = row.xp ?? row.xp_points ?? (wins * 60);
    const xp_points = row.xp_points ?? row.xp ?? (wins * 60);
    const player_level = row.player_level ?? getPlayerLevelFromXP(xp);
    const unlocked_skins = row.unlocked_skins ?? row.unlocked_skins_json ?? '[1]';

    return {
      username: cleanUser,
      display_name: row.display_name || username.trim(),
      coins,
      jc_balance,
      wins,
      wins_count,
      total_races: row.total_races || 0,
      horse_level: row.horse_level || 1,
      player_level,
      xp,
      xp_points,
      unlocked_skins_json: unlocked_skins,
      unlocked_skins,
      vip_status: row.vip_status || 0,
      last_played_race_index: row.last_played_race_index || 0,
      total_taps: row.total_taps || 0,
      total_gifts: row.total_gifts || 0,
      created_at: row.created_at || Date.now(),
      last_active: row.last_active || Date.now(),
    };
  }
  stmt.free();

  // Create default user with Tier 1
  const now = Date.now();
  const defaultCoins = 250;
  database.run(
    `INSERT INTO users (username, display_name, coins, jc_balance, wins, wins_count, total_races, horse_level, player_level, xp, xp_points, unlocked_skins_json, unlocked_skins, vip_status, last_played_race_index, total_taps, total_gifts, created_at, last_active)
     VALUES (?, ?, ?, ?, 0, 0, 0, 1, 1, 0, 0, '[1]', '[1]', 0, 0, 0, 0, ?, ?)`,
    [cleanUser, username.trim(), defaultCoins, defaultCoins, now, now]
  );
  saveDb();

  return {
    username: cleanUser,
    display_name: username.trim(),
    coins: defaultCoins,
    jc_balance: defaultCoins,
    wins: 0,
    wins_count: 0,
    total_races: 0,
    horse_level: 1,
    player_level: 1,
    xp: 0,
    xp_points: 0,
    unlocked_skins_json: '[1]',
    unlocked_skins: '[1]',
    vip_status: 0,
    last_played_race_index: 0,
    total_taps: 0,
    total_gifts: 0,
    created_at: now,
    last_active: now,
  };
}

export async function updateUserCoins(username: string, delta: number): Promise<number> {
  const user = await getUser(username);
  const database = await getDb();
  const newCoins = Math.max(0, user.jc_balance + delta);
  database.run(
    'UPDATE users SET coins = ?, jc_balance = ?, last_active = ? WHERE LOWER(username) = LOWER(?)',
    [newCoins, newCoins, Date.now(), user.username]
  );
  saveDb();
  return newCoins;
}

export interface AutoUnlockResult {
  user: UserRow;
  newlyUnlockedTiers: SkinTierMilestone[];
  highestTier: number;
}

/**
 * AUTOMATIC POST-RACE UNLOCK CHECK:
 * - Evaluates participant's updated metrics.
 * - Automatically unlocks the NEXT tier when:
 *   player_level >= reqLevel AND wins_count >= reqWins AND jc_balance >= reqJC
 * - Appends newly unlocked tiers to unlocked_skins in SQLite without deducting JC (milestone achievement).
 * - Automatically assigns each racer their highest unlocked tier by default for future races.
 */
export async function checkAndAutoUnlockTiers(username: string): Promise<AutoUnlockResult> {
  const user = await getUser(username);
  const database = await getDb();

  let unlockedList: number[] = [];
  try {
    const raw = user.unlocked_skins || user.unlocked_skins_json || '[1]';
    unlockedList = JSON.parse(raw);
    if (!Array.isArray(unlockedList)) unlockedList = [1];
  } catch {
    unlockedList = [1];
  }

  const newlyUnlockedTiers: SkinTierMilestone[] = [];

  for (const tierMilestone of SKIN_TIERS) {
    const meetsLevel = (user.player_level || 1) >= tierMilestone.reqLevel;
    const meetsWins = (user.wins_count || 0) >= tierMilestone.reqWins;
    const meetsJC = (user.jc_balance || 0) >= tierMilestone.reqJC;

    if (meetsLevel && meetsWins && meetsJC) {
      if (!unlockedList.includes(tierMilestone.tier)) {
        unlockedList.push(tierMilestone.tier);
        newlyUnlockedTiers.push(tierMilestone);
      }
    }
  }

  unlockedList.sort((a, b) => a - b);
  const highestTier = Math.max(...unlockedList, 1);

  if (newlyUnlockedTiers.length > 0 || user.horse_level !== highestTier) {
    const jsonStr = JSON.stringify(unlockedList);
    database.run(
      `UPDATE users 
       SET unlocked_skins = ?, unlocked_skins_json = ?, horse_level = ?, last_active = ? 
       WHERE LOWER(username) = LOWER(?)`,
      [jsonStr, jsonStr, highestTier, Date.now(), user.username]
    );
    saveDb();
    user.unlocked_skins = jsonStr;
    user.unlocked_skins_json = jsonStr;
    user.horse_level = highestTier;
  }

  return { user, newlyUnlockedTiers, highestTier };
}

/**
 * Record Race Participation & Awards:
 * - Players earn XP strictly by completing races (+10 XP) and winning races (+50 XP).
 * - Awards coins/JC for placing in race.
 * - Immediately checks and applies automatic tier unlocks.
 */
export async function recordRaceParticipation(
  username: string,
  isWinner: boolean,
  jcWon: number,
  raceIndex?: number
): Promise<{ user: UserRow; autoUnlocks: AutoUnlockResult }> {
  const user = await getUser(username);
  const database = await getDb();

  // XP: +10 for completing race, +50 for winning (+60 total for 1st place)
  const xpGained = 10 + (isWinner ? 50 : 0);
  const newXP = (user.xp || 0) + xpGained;
  const newLevel = getPlayerLevelFromXP(newXP);
  const newWins = (user.wins_count || 0) + (isWinner ? 1 : 0);
  const newJC = Math.max(0, (user.jc_balance || 0) + jcWon);
  const newTotalRaces = (user.total_races || 0) + 1;
  const newLastRaceIndex = typeof raceIndex === 'number' && raceIndex > 0 ? raceIndex : (user.last_played_race_index || 0);

  database.run(
    `UPDATE users 
     SET xp = ?, xp_points = ?, player_level = ?, wins_count = ?, wins = ?, jc_balance = ?, coins = ?, total_races = ?, last_played_race_index = ?, last_active = ?
     WHERE LOWER(username) = LOWER(?)`,
    [newXP, newXP, newLevel, newWins, newWins, newJC, newJC, newTotalRaces, newLastRaceIndex, Date.now(), user.username]
  );
  saveDb();

  const autoUnlocks = await checkAndAutoUnlockTiers(username);
  return { user: autoUnlocks.user, autoUnlocks };
}

/**
 * Progression & Milestone Formatting for !wins command:
 * 1. Query sender's record: wins_count, player_level, xp_points, jc_balance
 * 2. Identify player's NEXT locked skin tier requirement
 * 3. Format compact response string:
 *    "@username | Wins: 8 | Level: 12 (450 XP) | Next Tier Req: 15 Wins & Level 15"
 */
export function getNextLockedTier(user: UserRow): SkinTierMilestone | null {
  let unlockedList: number[] = [];
  try {
    const raw = user.unlocked_skins || user.unlocked_skins_json || '[1]';
    unlockedList = JSON.parse(raw);
    if (!Array.isArray(unlockedList)) unlockedList = [1];
  } catch {
    unlockedList = [1];
  }

  const currentLevel = user.player_level ?? 1;
  const currentWins = user.wins_count ?? user.wins ?? 0;
  const currentJC = user.jc_balance ?? user.coins ?? 0;

  for (const tierMilestone of SKIN_TIERS) {
    if (tierMilestone.tier === 1) continue; // Base tier is always unlocked
    const isUnlocked = unlockedList.includes(tierMilestone.tier) &&
      currentLevel >= tierMilestone.reqLevel &&
      currentWins >= tierMilestone.reqWins &&
      currentJC >= tierMilestone.reqJC;

    if (!isUnlocked) {
      return tierMilestone;
    }
  }

  return null; // All 12 tiers unlocked
}

export interface PlayerProgressionStatus {
  user: UserRow;
  username: string;
  displayName: string;
  wins_count: number;
  player_level: number;
  xp_points: number;
  jc_balance: number;
  nextTier: SkinTierMilestone | null;
  nextTierReq: string;
  formattedString: string;
}

export function getPlayerProgression(user: UserRow): PlayerProgressionStatus {
  const cleanUsername = user.username.replace(/^@/, '');
  const wins_count = user.wins_count ?? user.wins ?? 0;
  const player_level = user.player_level ?? 1;
  const xp_points = user.xp_points ?? user.xp ?? 0;
  const jc_balance = user.jc_balance ?? user.coins ?? 0;

  const nextTier = getNextLockedTier(user);
  let nextTierReq = 'Max Tier Reached';
  if (nextTier) {
    nextTierReq = `${nextTier.reqWins} Wins & Level ${nextTier.reqLevel}`;
  }

  // Exact requested format: "@username | Wins: 8 | Level: 12 (450 XP) | Next Tier Req: 15 Wins & Level 15"
  const formattedString = `@${cleanUsername} | Wins: ${wins_count} | Level: ${player_level} (${xp_points} XP) | Next Tier Req: ${nextTierReq}`;

  return {
    user,
    username: cleanUsername,
    displayName: user.display_name || cleanUsername,
    wins_count,
    player_level,
    xp_points,
    jc_balance,
    nextTier,
    nextTierReq,
    formattedString,
  };
}

export async function recordRaceWin(username: string, coinsWon: number): Promise<{ wins: number; coins: number; horseLevel: number; newUnlocked: boolean }> {
  const result = await recordRaceParticipation(username, true, coinsWon);
  return {
    wins: result.user.wins_count,
    coins: result.user.jc_balance,
    horseLevel: result.autoUnlocks.highestTier,
    newUnlocked: result.autoUnlocks.newlyUnlockedTiers.length > 0,
  };
}

export async function setVipStatus(username: string, isVip: boolean): Promise<boolean> {
  const user = await getUser(username);
  const database = await getDb();
  database.run('UPDATE users SET vip_status = ?, last_active = ? WHERE LOWER(username) = LOWER(?)', [
    isVip ? 1 : 0,
    Date.now(),
    user.username,
  ]);
  saveDb();
  return isVip;
}

export async function recordTapsAndGifts(username: string, taps: number, gifts: number): Promise<void> {
  const user = await getUser(username);
  const database = await getDb();
  database.run(
    'UPDATE users SET total_taps = total_taps + ?, total_gifts = total_gifts + ?, last_active = ? WHERE LOWER(username) = LOWER(?)',
    [taps, gifts, Date.now(), user.username]
  );
  saveDb();
}

export async function setPlayerLastPlayedRaceIndex(username: string, raceIndex: number): Promise<void> {
  const user = await getUser(username);
  const database = await getDb();
  database.run('UPDATE users SET last_played_race_index = ?, last_active = ? WHERE LOWER(username) = LOWER(?)', [
    raceIndex,
    Date.now(),
    user.username,
  ]);
  saveDb();
}

export async function getPlayerLastPlayedRaceIndex(username: string): Promise<number> {
  const user = await getUser(username);
  return user.last_played_race_index || 0;
}

export async function getLeaderboard(): Promise<UserRow[]> {
  const database = await getDb();
  const stmt = database.prepare('SELECT * FROM users ORDER BY wins DESC, coins DESC LIMIT 20');
  const list: UserRow[] = [];
  while (stmt.step()) {
    list.push(stmt.getAsObject() as unknown as UserRow);
  }
  stmt.free();
  return list;
}
