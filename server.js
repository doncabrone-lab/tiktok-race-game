/**
 * TikTok LIVE Jockey Bot - Server Entry Point
 * 
 * 1. STAMINA MATH & DRAIN LOGIC:
 *    - MAX_STAMINA_CAP = 100 STA for base tier horses.
 *    - BASE_STAMINA_DRAIN = 5 STA per second during continuous galloping.
 *    - Active Tapper Formula: 1 Tap = +0.5 STA added directly to horse pool (10 Taps = +5 STA).
 * 
 * 2. BALANCED GIFT CONVERSION MATH:
 *    - 1 Coin Gifts (Rose, Finger Heart): +3 STA.
 *    - 30 Coin Gifts (Doughnut): +15 STA + 5% speed boost for 1.5s.
 *    - 99 Coin Gifts (Paper Crane): +35 STA + 10% speed boost for 2.0s.
 *    - 500 Coin Gifts (Money Gun): +65 STA + 15% speed boost for 3.0s.
 *    - 5000+ Coin Gifts (Drama Queen, Universe): Set Stamina strictly to 100 STA (100% Refill, no overfilling beyond MAX_STAMINA_CAP) + trigger MAX Nitro Cap for 4.0s.
 * 
 * 3. OVERFILL PREVENTION (NO STAMINA STACKING):
 *    - Math condition: horse.stamina = Math.min(MAX_STAMINA_CAP, horse.stamina + addedStamina);
 *    - Prevents stamina pools from stacking over 100 STA so spamming gifts at race start does not break balance.
 */

import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { GameEngine, calculateGiftBoost, MAX_STAMINA_CAP, BASE_STAMINA_DRAIN, TAP_STAMINA_BONUS } from './server/gameEngine.ts';
import { getUser, getLeaderboard, setVipStatus, updateUserCoins, SKIN_TIERS } from './server/db.ts';

export { MAX_STAMINA_CAP, BASE_STAMINA_DRAIN, TAP_STAMINA_BONUS, calculateGiftBoost, SKIN_TIERS };

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' },
  });

  const PORT = 3000;

  app.use(express.json());

  // Static API endpoints
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '2.5.0',
      staminaCap: MAX_STAMINA_CAP,
      staminaDrain: BASE_STAMINA_DRAIN,
      tapBonus: TAP_STAMINA_BONUS,
    });
  });

  app.get('/api/progression-tiers', (req, res) => {
    res.json(SKIN_TIERS);
  });

  app.get('/api/leaderboard', async (req, res) => {
    try {
      const lb = await getLeaderboard();
      res.json(lb);
    } catch (err) {
      res.status(500).json({ error: (err && err.message) || String(err) });
    }
  });

  app.get('/api/user/:username', async (req, res) => {
    try {
      const user = await getUser(req.params.username);
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: (err && err.message) || String(err) });
    }
  });

  app.post('/api/user/:username/vip', async (req, res) => {
    try {
      const isVip = req.body.isVip !== false;
      const user = await setVipStatus(req.params.username, isVip);
      res.json({ success: true, user });
    } catch (err) {
      res.status(500).json({ error: (err && err.message) || String(err) });
    }
  });

  app.post('/api/user/:username/coins', async (req, res) => {
    try {
      const delta = parseInt(req.body.delta || '0', 10);
      const coins = await updateUserCoins(req.params.username, delta);
      res.json({ success: true, coins });
    } catch (err) {
      res.status(500).json({ error: (err && err.message) || String(err) });
    }
  });

  // Initialize Game Logic Engine (manages 10Hz tick, continuous 5 STA/s drain, and horse state)
  const gameEngine = new GameEngine(io);

  // Socket.io Connection & Event Handlers
  io.on('connection', (socket) => {
    // Send initial game state immediately
    socket.emit('game:state', gameEngine.state);

    // Lightweight chat message & command handler
    const handleChat = async (data) => {
      if (!data || !data.message) return;
      const cleanUser = (data.username || 'Spectator').replace(/^@/, '').trim();
      const message = String(data.message).trim();

      // Lightweight !wins command handler: chat response only "@username | X Wins"
      if (message.toLowerCase().startsWith('!wins')) {
        const parts = message.split(/\s+/);
        const targetUser = parts[1] ? parts[1].replace(/^@/, '').trim() : cleanUser;
        const user = await getUser(targetUser);
        const wins = user.wins_count ?? user.wins ?? 0;
        gameEngine.broadcastChatMessage({
          id: 'wins_' + Date.now(),
          username: targetUser,
          message: `@${targetUser} | ${wins} Wins`,
          type: 'chat',
          timestamp: Date.now(),
        });
        return;
      }

      await gameEngine.handleCommand(cleanUser, message, !!data.isBroadcaster);
    };

    socket.on('chat:send', handleChat);
    socket.on('chat:message', handleChat);
    socket.on('tiktok:chat', handleChat);

    /**
     * Active Tapper Formula:
     * 1 Tap = +0.5 STA added directly to the horse pool (10 Taps = +5 STA)
     * Overfill Prevention: horse.stamina = Math.min(MAX_STAMINA_CAP, horse.stamina + 0.5)
     */
    socket.on('horse:tap', (data) => {
      gameEngine.handleTap(data.username || 'Spectator', data.lane);
    });

    /**
     * Balanced Gift Conversion Math:
     * - 1 Coin Gifts (Rose, Finger Heart): +3 STA
     * - 30 Coin Gifts (Doughnut): +15 STA + 5% speed boost for 1.5s
     * - 99 Coin Gifts (Paper Crane): +35 STA + 10% speed boost for 2.0s
     * - 500 Coin Gifts (Money Gun): +65 STA + 15% speed boost for 3.0s
     * - 5000+ Coin Gifts (Drama Queen, Universe): Set Stamina strictly to 100 STA (100% Refill, no overfilling beyond MAX_STAMINA_CAP) + trigger MAX Nitro Cap for 4.0s
     */
    socket.on('horse:gift', (data) => {
      gameEngine.handleGift(data.username || 'Spectator', data.giftName || 'Rose', data.count || 1, data.lane);
    });

    socket.on('host:set_id', (data) => {
      if (data && data.hostId) {
        gameEngine.setHostId(data.hostId);
      }
    });

    socket.on('host:reset_race', () => {
      gameEngine.resetToLobby();
    });

    socket.on('host:set_duration', (data) => {
      if (data && (typeof data.duration === 'number' || data.duration === 'unlimited')) {
        gameEngine.setRaceDuration(data.duration);
      }
    });

    socket.on('host:set_lanes', (data) => {
      if (data && typeof data.lanes === 'number') {
        gameEngine.setActiveLanes(data.lanes);
      }
    });
  });

  // Vite middleware for development vs static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`TikTok LIVE Jockey Bot Server running on http://localhost:${PORT}`);
  });
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer();
}

export { startServer };
