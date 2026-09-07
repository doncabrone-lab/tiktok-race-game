import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { WebcastPushConnection } from 'tiktok-live-connector';
import { GameEngine } from './server/gameEngine.ts';
import { getUser, getLeaderboard, setVipStatus, updateUserCoins, SKIN_TIERS } from './server/db.ts';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = process.env.PORT || 3000;
  const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME || 'patronizzle';

  app.use(express.json());

  // Static skins and assets
  app.use('/assets', express.static(path.join(process.cwd(), 'public/assets')));
  app.use('/sounds', express.static(path.join(process.cwd(), 'public/sounds')));
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Socket.io setup
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const gameEngine = new GameEngine(io);

  // REST API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', phase: gameEngine.state.phase, connectedTo: TIKTOK_USERNAME });
  });

  app.get('/api/progression-tiers', (_req, res) => {
    res.json(SKIN_TIERS);
  });

  app.get('/api/leaderboard', async (req, res) => {
    try {
      const list = await getLeaderboard();
      res.json({ leaderboard: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/user/:username', async (req, res) => {
    try {
      const user = await getUser(req.params.username);
      res.json({ user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/user/:username/vip', async (req, res) => {
    try {
      const isVip = !!req.body.vip;
      await setVipStatus(req.params.username, isVip);
      const user = await getUser(req.params.username);
      res.json({ success: true, user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/user/:username/coins', async (req, res) => {
    try {
      const delta = parseInt(req.body.delta || '0', 10);
      const coins = await updateUserCoins(req.params.username, delta);
      res.json({ success: true, coins });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Central chat processing helper
  const processChatMessage = async (username: string, message: string, isBroadcaster: boolean = false) => {
    if (!message) return;
    const cleanUser = username.replace(/^@/, '').trim();
    const cleanMessage = String(message).trim();

    if (cleanMessage.toLowerCase().startsWith('!wins')) {
      const parts = cleanMessage.split(/\s+/);
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

    await gameEngine.handleCommand(cleanUser, cleanMessage, isBroadcaster);
  };

  // Socket.io Connection & Event Handlers
  io.on('connection', (socket) => {
    // Send initial game state immediately
    socket.emit('game:state', gameEngine.state);

    // Chat command & message handling
    const onChat = async (data: { username: string; message: string; isBroadcaster?: boolean }) => {
      if (!data || !data.message) return;
      await processChatMessage(data.username || 'Spectator', data.message, !!data.isBroadcaster);
    };

    socket.on('chat:send', onChat);
    socket.on('chat:message', onChat);
    socket.on('tiktok:chat', onChat);

    socket.on('horse:tap', (data: { username: string; lane?: number }) => {
      gameEngine.handleTap(data.username || 'Spectator', data.lane);
    });

    socket.on(
      'horse:gift',
      (data: {
        username: string;
        giftName: string;
        count?: number;
        lane?: number;
        coinValue?: number;
        diamondCount?: number;
        repeatCount?: number;
      }) => {
        gameEngine.handleGift(
          data.username || 'Spectator',
          data.giftName || 'Rose',
          data.count || data.repeatCount || 1,
          data.lane,
          {
            coinValue: data.coinValue,
            diamondCount: data.diamondCount,
            repeatCount: data.repeatCount,
          }
        );
      }
    );

    socket.on(
      'tiktok:gift',
      (data: {
        username: string;
        giftName: string;
        count?: number;
        lane?: number;
        coinValue?: number;
        diamondCount?: number;
        repeatCount?: number;
      }) => {
        gameEngine.handleGift(
          data.username || 'Spectator',
          data.giftName || 'Rose',
          data.count || data.repeatCount || 1,
          data.lane,
          {
            coinValue: data.coinValue,
            diamondCount: data.diamondCount,
            repeatCount: data.repeatCount,
          }
        );
      }
    );

    socket.on('host:pause_lobby', (data: { paused?: boolean }) => {
      if (typeof data?.paused === 'boolean') {
        gameEngine.setPauseLobby(data.paused);
      } else {
        gameEngine.togglePauseLobby();
      }
    });

    socket.on('host:toggle_pause_lobby', () => {
      gameEngine.togglePauseLobby();
    });

    socket.on(
      'host:set_match_mode',
      (data: { mode: 'PUBLIC' | 'INVITE_ONLY'; invitedUsers?: string[] }) => {
        if (data && (data.mode === 'PUBLIC' || data.mode === 'INVITE_ONLY')) {
          gameEngine.setMatchMode(data.mode, data.invitedUsers || []);
        }
      }
    );

    socket.on('host:set_id', (data: { hostId: string }) => {
      if (data?.hostId) {
        gameEngine.setHostId(data.hostId);
      }
    });

    socket.on('host:reset_race', () => {
      gameEngine.resetToLobby();
    });

    socket.on('host:set_duration', (data: { duration: number | 'unlimited' }) => {
      if (data && (typeof data.duration === 'number' || data.duration === 'unlimited')) {
        gameEngine.setRaceDuration(data.duration);
      }
    });

    socket.on('host:set_lanes', (data: { lanes: number }) => {
      if (data && typeof data.lanes === 'number') {
        gameEngine.setActiveLanes(data.lanes);
      }
    });
  });

  // ==========================================
  // NATIVE TIKTOK LIVE CONNECTOR
  // ==========================================
  function connectToTikTok(targetUsername: string) {
    console.log(`[TikTok] Connecting to Live Room of @${targetUsername}...`);

    const tiktokLiveConnection = new WebcastPushConnection(targetUsername, {
      processInitialData: false,
      enableExtendedGiftInfo: true,
      requestPollingIntervalMs: 2000,
    });

    tiktokLiveConnection
      .connect()
      .then((state) => {
        console.log(`[TikTok] Successfully connected to Room ID: ${state.roomId}`);
      })
      .catch((err) => {
        console.error(`[TikTok] Failed to connect to @${targetUsername}:`, err.message || err);
        setTimeout(() => connectToTikTok(targetUsername), 30000);
      });

    tiktokLiveConnection.on('chat', (data) => {
      const isBroadcaster = data.uniqueId.toLowerCase() === targetUsername.toLowerCase();
      processChatMessage(data.uniqueId, data.comment, isBroadcaster);
    });

    tiktokLiveConnection.on('like', (data) => {
      const tapCount = data.likeCount || 1;
      for (let i = 0; i < Math.min(tapCount, 10); i++) {
        gameEngine.handleTap(data.uniqueId);
      }
    });

    tiktokLiveConnection.on('gift', (data) => {
      if (data.giftType === 1 && data.repeatEnd === false) return;
      gameEngine.handleGift(
        data.uniqueId,
        data.giftName || 'Rose',
        data.repeatCount || 1,
        undefined,
        {
          coinValue: data.diamondCount ? data.diamondCount * 2 : 1,
          diamondCount: data.diamondCount,
          repeatCount: data.repeatCount,
        }
      );
    });

    tiktokLiveConnection.on('streamEnd', () => {
      console.log(`[TikTok] Stream for @${targetUsername} ended.`);
      setTimeout(() => connectToTikTok(targetUsername), 30000);
    });

    tiktokLiveConnection.on('disconnected', () => {
      console.log(`[TikTok] Disconnected from @${targetUsername}. Retrying in 10s...`);
      setTimeout(() => connectToTikTok(targetUsername), 10000);
    });
  }

  // Start connection
  connectToTikTok(TIKTOK_USERNAME);

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

startServer();
