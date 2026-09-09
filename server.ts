import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { WebcastPushConnection } from 'tiktok-live-connector';
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

  // Render provides PORT automatically.
  const PORT = process.env.PORT || 3000;

  // Set TIKTOK_USERNAME in Render Environment Variables.
  // Defaults to patronizzle for convenience.
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

  // Socket.io
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const gameEngine = new GameEngine(io);

  // =========================================================
  // REST API
  // =========================================================

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
      console.error('[API] Leaderboard error:', err);
      res.status(500).json({ error: err?.message || 'Failed to load leaderboard' });
    }
  });

  app.get('/api/user/:username', async (req, res) => {
    try {
      const user = await getUser(req.params.username);
      res.json({ user });
    } catch (err: any) {
      console.error('[API] User error:', err);
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
      console.error('[API] VIP error:', err);
      res.status(500).json({ error: err?.message || 'Failed to update VIP' });
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
      console.error('[API] Coins error:', err);
      res.status(500).json({ error: err?.message || 'Failed to update coins' });
    }
  });

  // =========================================================
  // NORMALIZED CHAT PROCESSING
  // =========================================================

  const processChatMessage = async (
    username: string,
    message: string,
    isBroadcaster: boolean = false
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

    try {
      await gameEngine.handleCommand(
        cleanUsername,
        cleanMessage,
        isBroadcaster
      );
    } catch (err: any) {
      console.error(
        `[COMMAND] ERROR @${cleanUsername}:`,
        err?.stack || err?.message || err
      );
    }
  };

  // =========================================================
  // SOCKET.IO
  // =========================================================

  io.on('connection', (socket) => {
    console.log(`[Socket] Browser connected: ${socket.id}`);

    // Send current game state immediately.
    socket.emit('game:state', gameEngine.state);

    // Browser/local testing chat
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

    // Browser/local testing taps
    socket.on(
      'horse:tap',
      (data: {
        username: string;
        lane?: number;
      }) => {
        const username = data?.username || 'Spectator';

        console.log(
          `[Socket] TAP @${username}${
            data?.lane ? ` lane=${data.lane}` : ''
          }`
        );

        gameEngine.handleTap(username, data?.lane);
      }
    );

    // Browser/local testing gifts
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

    // =======================================================
    // HOST CONTROLS
    // =======================================================

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
      (data: { duration: number | 'unlimited' }) => {
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

    console.log(`[Socket] Browser connected successfully: ${socket.id}`);
  });

  // =========================================================
  // TIKTOK LIVE CONNECTOR
  //
  // TikTok LIVE
  //     ↓
  // WebcastPushConnection
  //     ↓
  // chat / like / gift
  //     ↓
  // GameEngine
  // =========================================================

  const scheduleTikTokReconnect = (delayMs: number) => {
    if (tiktokReconnectTimer) {
      return;
    }

    console.log(
      `[TikTok] Reconnecting in ${Math.round(
        delayMs / 1000
      )} seconds...`
    );

    tiktokReconnectTimer = setTimeout(() => {
      tiktokReconnectTimer = null;
      connectToTikTok();
    }, delayMs);
  };

  const connectToTikTok = () => {
    if (!TIKTOK_USERNAME) {
      console.error(
        '[TikTok] ERROR: TIKTOK_USERNAME is not configured.'
      );
      return;
    }

    console.log(
      `[TikTok] Connecting to LIVE Room of @${TIKTOK_USERNAME}...`
    );

    tiktokConnected = false;
    tiktokRoomId = null;

    const connection = new WebcastPushConnection(
      TIKTOK_USERNAME,
      {
        processInitialData: false,
        enableExtendedGiftInfo: true,
        requestPollingIntervalMs: 2000,
      }
    );

    // -------------------------------------------------------
    // CONNECT
    // -------------------------------------------------------

    connection
      .connect()
      .then((state: any) => {
        tiktokConnected = true;
        tiktokRoomId = String(state?.roomId || '');

        console.log(
          `[TikTok] CONNECTED @${TIKTOK_USERNAME} room=${tiktokRoomId}`
        );
      })
      .catch((err: any) => {
        tiktokConnected = false;
        tiktokRoomId = null;

        console.error(
          `[TikTok] CONNECT FAILED @${TIKTOK_USERNAME}:`,
          err?.message || err
        );

        scheduleTikTokReconnect(30000);
      });

    // -------------------------------------------------------
    // CHAT
    // -------------------------------------------------------

    connection.on('chat', (data: any) => {
      const username = String(
        data?.uniqueId ||
          data?.nickname ||
          'Spectator'
      )
        .replace(/^@/, '')
        .trim();

      const message = String(
        data?.comment || ''
      ).trim();

      if (!message) return;

      const isBroadcaster =
        username.toLowerCase() ===
        TIKTOK_USERNAME.toLowerCase();

      console.log(
        `[TikTok] CHAT @${username}: ${message}`
      );

      void processChatMessage(
        username,
        message,
        isBroadcaster
      );
    });

    // -------------------------------------------------------
    // LIKES / TAPS
    // -------------------------------------------------------

    connection.on('like', (data: any) => {
      const username = String(
        data?.uniqueId ||
          data?.nickname ||
          'Spectator'
      )
        .replace(/^@/, '')
        .trim();

      const likeCount = Math.max(
        1,
        Number(data?.likeCount || 1)
      );

      // Prevent a huge like event from flooding
      // the game engine.
      const tapCount = Math.min(
        likeCount,
        10
      );

      console.log(
        `[TikTok] LIKE @${username} x${likeCount} -> ${tapCount} taps`
      );

      for (let i = 0; i < tapCount; i++) {
        // IMPORTANT:
        // No lane is supplied here.
        //
        // GameEngine.handleTap() determines the
        // correct target from the user's racer/bettor
        // registration.
        gameEngine.handleTap(username);
      }
    });

    // -------------------------------------------------------
    // GIFTS
    // -------------------------------------------------------

    connection.on('gift', (data: any) => {
      const username = String(
        data?.uniqueId ||
          data?.nickname ||
          'Spectator'
      )
        .replace(/^@/, '')
        .trim();

      const giftName = String(
        data?.giftName || 'Rose'
      );

      const repeatCount = Math.max(
        1,
        Number(data?.repeatCount || 1)
      );

      const giftType = Number(
        data?.giftType || 0
      );

      const repeatEnd = data?.repeatEnd;

      // Combo gifts can produce multiple events
      // while the combo is still running.
      //
      // Only process the final event.
      if (
        giftType === 1 &&
        repeatEnd === false
      ) {
        return;
      }

      const diamondCount = Number(
        data?.diamondCount || 0
      );

      const coinValue =
        diamondCount > 0
          ? diamondCount * 2
          : 1;

      console.log(
        `[TikTok] GIFT @${username}: ${giftName} x${repeatCount} diamonds=${diamondCount}`
      );

      // IMPORTANT:
      // No lane is supplied.
      //
      // GameEngine.handleGift() determines the
      // correct target from the user's racer/bettor
      // registration.
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

    // -------------------------------------------------------
    // LIVE ENDED
    // -------------------------------------------------------

    connection.on('streamEnd', () => {
      tiktokConnected = false;
      tiktokRoomId = null;

      console.log(
        `[TikTok] LIVE ended for @${TIKTOK_USERNAME}.`
      );

      scheduleTikTokReconnect(30000);
    });

    // -------------------------------------------------------
    // DISCONNECTED
    // -------------------------------------------------------

    connection.on('disconnected', () => {
      tiktokConnected = false;
      tiktokRoomId = null;

      console.log(
        `[TikTok] Disconnected from @${TIKTOK_USERNAME}.`
      );

      scheduleTikTokReconnect(10000);
    });
  };

  // Start TikTok connection.
  connectToTikTok();

  // =========================================================
  // VITE / PRODUCTION
  // =========================================================

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

    app.use(express.static(distPath));

    app.get('*', (_req, res) => {
      res.sendFile(
        path.join(distPath, 'index.html')
      );
    });
  }

  // =========================================================
  // START SERVER
  // =========================================================

  server.listen(
    PORT,
    '0.0.0.0',
    () => {
      console.log(
        `TikTok LIVE Jockey Bot Server running on port ${PORT}`
      );

      console.log(
        `[TikTok] Target LIVE username: @${TIKTOK_USERNAME}`
      );
    }
  );
}

startServer();
