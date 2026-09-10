import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { TikTokLive } from 'tiktok-live-api';
import { createServer as createViteServer } from 'vite';

import { GameEngine } from './server/gameEngine.ts';
import {
  getUser,
  getLeaderboard,
  setVipStatus,
  updateUserCoins,
  SKIN_TIERS,
} from './server/db.ts';

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  const PORT = process.env.PORT || 3000;

  const TIKTOK_USERNAME = (process.env.TIKTOK_USERNAME || 'patronizzle')
    .replace(/^@/, '')
    .trim();

  let tiktokConnected = false;
  let tiktokRoomId: string | null = null;
  let tiktokReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  app.use(express.json());

  // Static assets
  app.use('/assets', express.static(path.join(process.cwd(), 'public/assets')));
  app.use('/sounds', express.static(path.join(process.cwd(), 'public/sounds')));
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Socket.IO
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const gameEngine = new GameEngine(io);

  // ==========================================
  // TIKTOK CHAT -> GAME COMMANDS
  // ==========================================

  const processChatMessage = async (
    username: string,
    message: string,
    isBroadcaster = false
  ) => {
    const cleanUsername = String(username || 'Spectator')
      .replace(/^@/, '')
      .trim();

    const cleanMessage = String(message || '').trim();

    if (!cleanMessage) return;

    console.log(
      `[COMMAND] @${cleanUsername}: ${cleanMessage}${
        isBroadcaster ? ' [HOST]' : ''
      }`
    );

    await gameEngine.handleCommand(
      cleanUsername,
      cleanMessage,
      isBroadcaster
    );
  };

  // ==========================================
  // REST API
  // ==========================================

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      phase: gameEngine.state.phase,
      tiktok: {
        username: TIKTOK_USERNAME,
        connected: tiktokConnected,
        roomId: tiktokRoomId,
      },
    });
  });

  app.get('/api/tiktok-status', (_req, res) => {
    res.json({
      username: TIKTOK_USERNAME,
      connected: tiktokConnected,
      roomId: tiktokRoomId,
    });
  });

  app.get('/api/progression-tiers', (_req, res) => {
    res.json(SKIN_TIERS);
  });

  app.get('/api/leaderboard', async (_req, res) => {
    try {
      const list = await getLeaderboard();
      res.json({ leaderboard: list });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to load leaderboard' });
    }
  });

  app.get('/api/user/:username', async (req, res) => {
    try {
      const user = await getUser(req.params.username);
      res.json({ user });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to load user' });
    }
  });

  app.post('/api/user/:username/vip', async (req, res) => {
    try {
      const isVip = !!req.body.vip;

      await setVipStatus(req.params.username, isVip);

      const user = await getUser(req.params.username);

      res.json({
        success: true,
        user,
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Failed to update VIP status',
      });
    }
  });

  app.post('/api/user/:username/coins', async (req, res) => {
    try {
      const delta = parseInt(req.body.delta || '0', 10);

      const coins = await updateUserCoins(
        req.params.username,
        delta
      );

      res.json({
        success: true,
        coins,
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Failed to update coins',
      });
    }
  });

  // ==========================================
  // SOCKET.IO
  // ==========================================

  io.on('connection', (socket) => {
    socket.emit('game:state', gameEngine.state);

    const onChat = async (data: {
      username: string;
      message: string;
      isBroadcaster?: boolean;
    }) => {
      if (!data || !data.message) return;

      await processChatMessage(
        data.username || 'Spectator',
        data.message,
        !!data.isBroadcaster
      );
    };

    socket.on('chat:send', onChat);
    socket.on('chat:message', onChat);
    socket.on('tiktok:chat', onChat);

    socket.on(
      'horse:tap',
      (data: {
        username: string;
        lane?: number;
      }) => {
        gameEngine.handleTap(
          data?.username || 'Spectator',
          data?.lane
        );
      }
    );

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
          data?.username || 'Spectator',
          data?.giftName || 'Rose',
          data?.count || data?.repeatCount || 1,
          data?.lane,
          {
            coinValue: data?.coinValue,
            diamondCount: data?.diamondCount,
            repeatCount: data?.repeatCount,
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
          data?.username || 'Spectator',
          data?.giftName || 'Rose',
          data?.count || data?.repeatCount || 1,
          data?.lane,
          {
            coinValue: data?.coinValue,
            diamondCount: data?.diamondCount,
            repeatCount: data?.repeatCount,
          }
        );
      }
    );

    socket.on(
      'host:pause_lobby',
      (data: { paused?: boolean }) => {
        if (typeof data?.paused === 'boolean') {
          gameEngine.setPauseLobby(data.paused);
        } else {
          gameEngine.togglePauseLobby();
        }
      }
    );

    socket.on('host:toggle_pause_lobby', () => {
      gameEngine.togglePauseLobby();
    });

    socket.on(
      'host:set_match_mode',
      (data: {
        mode: 'PUBLIC' | 'INVITE_ONLY';
        invitedUsers?: string[];
      }) => {
        if (
          data &&
          (data.mode === 'PUBLIC' ||
            data.mode === 'INVITE_ONLY')
        ) {
          gameEngine.setMatchMode(
            data.mode,
            data.invitedUsers || []
          );
        }
      }
    );

    socket.on(
      'host:set_id',
      (data: { hostId: string }) => {
        if (data?.hostId) {
          gameEngine.setHostId(data.hostId);
        }
      }
    );

    socket.on('host:reset_race', () => {
      gameEngine.resetToLobby();
    });

    socket.on(
      'host:set_duration',
      (data: {
        duration: number | 'unlimited';
      }) => {
        if (
          data &&
          (typeof data.duration === 'number' ||
            data.duration === 'unlimited')
        ) {
          gameEngine.setRaceDuration(data.duration);
        }
      }
    );

    socket.on(
      'host:set_meters',
      (data: { meters: number }) => {
        if (
          data &&
          typeof data.meters === 'number'
        ) {
          gameEngine.setRaceMeters(data.meters);
        }
      }
    );

    socket.on(
      'host:set_lanes',
      (data: { lanes: number }) => {
        if (
          data &&
          typeof data.lanes === 'number'
        ) {
          gameEngine.setActiveLanes(data.lanes);
        }
      }
    );
  });

  // ==========================================
  // TIKTOK LIVE CONNECTOR
  // ==========================================

  const scheduleTikTokReconnect = (delayMs: number) => {
    if (tiktokReconnectTimer) return;

    tiktokReconnectTimer = setTimeout(() => {
      tiktokReconnectTimer = null;
      connectToTikTok();
    }, delayMs);
  };

  const connectToTikTok = () => {
    if (!TIKTOK_USERNAME) {
      console.error('[TikTok] No TIKTOK_USERNAME configured.');
      return;
    }

    if (!process.env.TIKTOOL_API_KEY) {
      console.error('[TikTok] No TIKTOOL_API_KEY configured in Render Environment Variables.');
      return;
    }

    console.log(`[TikTok] Connecting to Live Room of @${TIKTOK_USERNAME} via TikTool...`);

    // Diagnostic check: verify the same API key works against TikTool's
    // REST API before attempting the WebSocket connection. This lets us
    // distinguish an API-key/tier problem from a WebSocket/SDK problem.
    void (async () => {
      try {
        const diagnosticUrl =
          `https://api.tik.tools/webcast/check_alive?apiKey=${encodeURIComponent(
            process.env.TIKTOOL_API_KEY!
          )}&unique_id=${encodeURIComponent(TIKTOK_USERNAME)}`;

        const response = await fetch(diagnosticUrl);
        const body = await response.text();

        console.log(
          `[TikTok] REST DIAGNOSTIC: HTTP ${response.status} ${response.statusText}`
        );
        console.log(`[TikTok] REST DIAGNOSTIC BODY: ${body.slice(0, 2000)}`);
      } catch (err: any) {
        console.error(
          '[TikTok] REST DIAGNOSTIC FAILED:',
          err?.message || err
        );
      }
    })();

    tiktokConnected = false;
    tiktokRoomId = null;

    const connection = new TikTokLive(TIKTOK_USERNAME, {
      apiKey: process.env.TIKTOOL_API_KEY,
      autoReconnect: false,
      maxReconnectAttempts: 0,
    });

    // ------------------------------------------
    // CONNECTED
    // ------------------------------------------

    connection.on('connected', () => {
      tiktokConnected = true;
      console.log(`[TikTok] CONNECTED @${TIKTOK_USERNAME}`);
    });

    connection.on('roomInfo', (data: any) => {
      tiktokRoomId = data?.roomId ? String(data.roomId) : null;
      console.log(`[TikTok] ROOM INFO @${TIKTOK_USERNAME} room=${tiktokRoomId || 'unknown'}`);
    });

    connection.on('status', (data: any) => {
      console.log('[TikTok] STATUS:', data?.status || data?.message || data);
    });

    // ------------------------------------------
    // CHAT
    // ------------------------------------------

    connection.on('chat', (data: any) => {
      const username = String(
        data?.user?.uniqueId ||
          data?.uniqueId ||
          data?.user?.nickname ||
          data?.nickname ||
          'Spectator'
      ).replace(/^@/, '');

      const message = String(data?.comment || '').trim();
      if (!message) return;

      const isBroadcaster =
        username.toLowerCase() === TIKTOK_USERNAME.toLowerCase();

      console.log(`[TikTok] CHAT @${username}: ${message}`);

      void processChatMessage(username, message, isBroadcaster).catch((err: any) => {
        console.error(
          `[TikTok] CHAT PROCESS ERROR @${username}:`,
          err?.message || err
        );
      });
    });

    // ------------------------------------------
    // LIKES
    // ------------------------------------------

    connection.on('like', (data: any) => {
      const username = String(
        data?.user?.uniqueId ||
          data?.uniqueId ||
          data?.user?.nickname ||
          data?.nickname ||
          'Spectator'
      ).replace(/^@/, '');

      const likeCount = Math.max(1, Number(data?.likeCount || 1));
      const tapCount = Math.min(likeCount, 10);

      console.log(`[TikTok] LIKE @${username} x${likeCount} -> ${tapCount} taps`);

      for (let i = 0; i < tapCount; i++) {
        gameEngine.handleTap(username);
      }
    });

    // ------------------------------------------
    // GIFTS
    // ------------------------------------------

    connection.on('gift', (data: any) => {
      const username = String(
        data?.user?.uniqueId ||
          data?.uniqueId ||
          data?.user?.nickname ||
          data?.nickname ||
          'Spectator'
      ).replace(/^@/, '');

      const giftName = String(data?.giftName || 'Rose');
      const repeatCount = Math.max(1, Number(data?.repeatCount || 1));
      const giftType = Number(data?.giftType ?? 0);
      const repeatEnd = data?.repeatEnd;

      if (giftType === 1 && repeatEnd === false) {
        return;
      }

      const diamondCount = Number(data?.diamondCount || 0);
      const coinValue = diamondCount > 0 ? diamondCount * 2 : 1;

      console.log(
        `[TikTok] GIFT @${username}: ${giftName} x${repeatCount} diamonds=${diamondCount}`
      );

      gameEngine.handleGift(
        username,
        giftName,
        repeatCount,
        undefined,
        {
          coinValue,
          diamondCount,
          repeatCount,
        }
      );
    });

    // ------------------------------------------
    // ERROR
    // ------------------------------------------

    connection.on('error', (data: any) => {
      console.error(
        '[TikTok] CONNECTION ERROR:',
        data?.message || data?.error || data
      );
    });

    // ------------------------------------------
    // DISCONNECT
    // ------------------------------------------

    connection.on('disconnected', (data: any) => {
      tiktokConnected = false;
      tiktokRoomId = null;

      console.log(
        `[TikTok] Disconnected from @${TIKTOK_USERNAME}. Retrying in 10s...`,
        data?.reason || ''
      );

      scheduleTikTokReconnect(10000);
    });

    connection
      .connect()
      .catch((err: any) => {
        tiktokConnected = false;
        tiktokRoomId = null;

        console.error(
          `[TikTok] CONNECT FAILED @${TIKTOK_USERNAME}:`,
          err?.message || err
        );

        scheduleTikTokReconnect(30000);
      });
  };

  connectToTikTok();

  // VITE / PRODUCTION
  // ==========================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(
      process.cwd(),
      'dist'
    );

    app.use(
      express.static(distPath)
    );

    app.get('*', (_req, res) => {
      res.sendFile(
        path.join(
          distPath,
          'index.html'
        )
      );
    });
  }

  server.listen(
    PORT,
    '0.0.0.0',
    () => {
      console.log(
        `TikTok LIVE Jockey Bot Server running on http://localhost:${PORT}`
      );
    }
  );
}

startServer().catch((err) => {
  console.error(
    '[Server] Fatal startup error:',
    err
  );

  process.exit(1);
});
