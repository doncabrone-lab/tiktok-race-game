import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
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
  // REMOTE TIKTOK CONNECTOR CONFIGURATION
  // ==========================================

  const TIKTOK_CONNECTOR_MODE =
    String(process.env.TIKTOK_CONNECTOR_MODE || 'remote')
      .trim()
      .toLowerCase();

  const TIKTOK_RELAY_TOKEN =
    String(process.env.TIKTOK_RELAY_TOKEN || '').trim();

  let remoteTikTokConnected = false;

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
  // REMOTE TIKTOK CONNECTOR RELAY
  // ==========================================

  app.post('/api/tiktok-relay', async (req, res) => {
    if (TIKTOK_CONNECTOR_MODE !== 'remote') {
      return res.status(404).json({
        error: 'Remote TikTok relay disabled',
      });
    }

    if (!TIKTOK_RELAY_TOKEN) {
      return res.status(503).json({
        error: 'TIKTOK_RELAY_TOKEN is not configured',
      });
    }

    const suppliedToken = String(
      req.get('x-tiktok-relay-token') || ''
    );

    if (suppliedToken !== TIKTOK_RELAY_TOKEN) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const type = String(req.body?.type || '');

    try {
      if (type === 'status') {
        remoteTikTokConnected = !!req.body?.connected;

        if (!remoteTikTokConnected) {
          tiktokRoomId = null;
        } else if (req.body?.roomId) {
          tiktokRoomId = String(req.body.roomId);
        }

        tiktokConnected = remoteTikTokConnected;

        return res.json({
          ok: true,
        });
      }

      if (type === 'chat') {
        await processChatMessage(
          String(req.body?.username || 'Spectator'),
          String(req.body?.message || ''),
          !!req.body?.isBroadcaster
        );

        return res.json({
          ok: true,
        });
      }

      if (type === 'like') {
        const username = String(
          req.body?.username || 'Spectator'
        );

        const count = Math.min(
          Math.max(1, Number(req.body?.count || 1)),
          10
        );

        for (let i = 0; i < count; i++) {
          gameEngine.handleTap(username);
        }

        return res.json({
          ok: true,
        });
      }

      if (type === 'gift') {
        const username = String(
          req.body?.username || 'Spectator'
        );

        const giftName = String(
          req.body?.giftName || 'Rose'
        );

        const repeatCount = Math.max(
          1,
          Number(req.body?.repeatCount || 1)
        );

        const diamondCount = Math.max(
          0,
          Number(req.body?.diamondCount || 0)
        );

        const coinValue = Math.max(
          1,
          Number(
            req.body?.coinValue ||
              (diamondCount > 0 ? diamondCount * 2 : 1)
          )
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

        return res.json({
          ok: true,
        });
      }

      return res.status(400).json({
        error: `Unknown relay type: ${type}`,
      });
    } catch (err: any) {
      console.error(
        '[TikTok Relay] Processing error:',
        err?.message || err
      );

      return res.status(500).json({
        error: err?.message || 'Relay processing failed',
      });
    }
  });

  // ==========================================
  // REST API
  // ==========================================

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      phase: gameEngine.state.phase,
      tiktok: {
        username: TIKTOK_USERNAME,
        connected:
          TIKTOK_CONNECTOR_MODE === 'remote'
            ? remoteTikTokConnected
            : tiktokConnected,
        roomId: tiktokRoomId,
      },
    });
  });

  app.get('/api/tiktok-status', (_req, res) => {
    res.json({
      username: TIKTOK_USERNAME,
      connected:
        TIKTOK_CONNECTOR_MODE === 'remote'
          ? remoteTikTokConnected
          : tiktokConnected,
      roomId: tiktokRoomId,
    });
  });

  app.get('/api/progression-tiers', (_req, res) => {
    res.json(SKIN_TIERS);
  });

  app.get('/api/leaderboard', async (_req, res) => {
    try {
      const list = await getLeaderboard();

      res.json({
        leaderboard: list,
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Failed to load leaderboard',
      });
    }
  });

  app.get('/api/user/:username', async (req, res) => {
    try {
      const user = await getUser(req.params.username);

      res.json({
        user,
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Failed to load user',
      });
    }
  });

  app.post('/api/user/:username/vip', async (req, res) => {
    try {
      const isVip = !!req.body.vip;

      await setVipStatus(
        req.params.username,
        isVip
      );

      const user = await getUser(
        req.params.username
      );

      res.json({
        success: true,
        user,
      });
    } catch (err: any) {
      res.status(500).json({
        error:
          err?.message ||
          'Failed to update VIP status',
      });
    }
  });

  app.post('/api/user/:username/coins', async (req, res) => {
    try {
      const delta = parseInt(
        req.body.delta || '0',
        10
      );

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
        error:
          err?.message ||
          'Failed to update coins',
      });
    }
  });

  // ==========================================
  // SOCKET.IO
  // ==========================================

  io.on('connection', (socket) => {
    socket.emit(
      'game:state',
      gameEngine.state
    );

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
          data?.count ||
            data?.repeatCount ||
            1,
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
          data?.count ||
            data?.repeatCount ||
            1,
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
      (data: {
        paused?: boolean;
      }) => {
        if (
          typeof data?.paused === 'boolean'
        ) {
          gameEngine.setPauseLobby(
            data.paused
          );
        } else {
          gameEngine.togglePauseLobby();
        }
      }
    );

    socket.on(
      'host:toggle_pause_lobby',
      () => {
        gameEngine.togglePauseLobby();
      }
    );

    socket.on(
      'host:set_match_mode',
      (data: {
        mode:
          | 'PUBLIC'
          | 'INVITE_ONLY';
        invitedUsers?: string[];
      }) => {
        if (
          data &&
          (
            data.mode === 'PUBLIC' ||
            data.mode === 'INVITE_ONLY'
          )
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
      (data: {
        hostId: string;
      }) => {
        if (data?.hostId) {
          gameEngine.setHostId(
            data.hostId
          );
        }
      }
    );

    socket.on(
      'host:reset_race',
      () => {
        gameEngine.resetToLobby();
      }
    );

    socket.on(
      'host:set_duration',
      (data: {
        duration:
          | number
          | 'unlimited';
      }) => {
        if (
          data &&
          (
            typeof data.duration === 'number' ||
            data.duration === 'unlimited'
          )
        ) {
          gameEngine.setRaceDuration(
            data.duration
          );
        }
      }
    );

    socket.on(
      'host:set_meters',
      (data: {
        meters: number;
      }) => {
        if (
          data &&
          typeof data.meters === 'number'
        ) {
          gameEngine.setRaceMeters(
            data.meters
          );
        }
      }
    );

    socket.on(
      'host:set_lanes',
      (data: {
        lanes: number;
      }) => {
        if (
          data &&
          typeof data.lanes === 'number'
        ) {
          gameEngine.setActiveLanes(
            data.lanes
          );
        }
      }
    );
  });

  // ==========================================
  // TIKTOK LIVE CONNECTOR
  // ==========================================

  const scheduleTikTokReconnect = (
    delayMs: number
  ) => {
    if (tiktokReconnectTimer) return;

    tiktokReconnectTimer = setTimeout(() => {
      tiktokReconnectTimer = null;
      connectToTikTok();
    }, delayMs);
  };

  const connectToTikTok = async () => {
    if (!TIKTOK_USERNAME) {
      console.error(
        '[TikTok] No TIKTOK_USERNAME configured.'
      );
      return;
    }

    const apiKey =
      process.env.TIKTOOL_API_KEY;

    if (!apiKey) {
      console.error(
        '[TikTok] No TIKTOOL_API_KEY configured in Render Environment Variables.'
      );
      return;
    }

    console.log(
      `[TikTok] Connecting to Live Room of @${TIKTOK_USERNAME} via TikTool RELAYED mode...`
    );

    try {
      const { TikTokLive } =
        await import('@tiktool/live');

      tiktokConnected = false;
      tiktokRoomId = null;

      const connection =
        new TikTokLive({
          uniqueId: TIKTOK_USERNAME,
          apiKey,
          mode: 'relayed',
          autoReconnect: false,
          maxReconnectAttempts: 0,
        });

      connection.on(
        'connected',
        () => {
          tiktokConnected = true;

          tiktokRoomId =
            connection.roomId
              ? String(connection.roomId)
              : null;

          console.log(
            `[TikTok] CONNECTED @${TIKTOK_USERNAME} via TikTool RELAYED mode room=${tiktokRoomId || 'unknown'}`
          );
        }
      );

      connection.on(
        'roomInfo',
        (data: any) => {
          tiktokRoomId =
            data?.roomId
              ? String(data.roomId)
              : tiktokRoomId;

          console.log(
            `[TikTok] ROOM INFO @${TIKTOK_USERNAME} room=${tiktokRoomId || 'unknown'}`
          );
        }
      );

      connection.on(
        'chat',
        (data: any) => {
          const username = String(
            data?.user?.uniqueId ||
              data?.uniqueId ||
              data?.user?.nickname ||
              data?.nickname ||
              'Spectator'
          ).replace(/^@/, '');

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
          ).catch((err: any) => {
            console.error(
              `[TikTok] CHAT PROCESS ERROR @${username}:`,
              err?.message || err
            );
          });
        }
      );

      connection.on(
        'like',
        (data: any) => {
          const username = String(
            data?.user?.uniqueId ||
              data?.uniqueId ||
              data?.user?.nickname ||
              data?.nickname ||
              'Spectator'
          ).replace(/^@/, '');

          const likeCount = Math.max(
            1,
            Number(data?.likeCount || 1)
          );

          const tapCount = Math.min(
            likeCount,
            10
          );

          console.log(
            `[TikTok] LIKE @${username} x${likeCount} -> ${tapCount} taps`
          );

          for (
            let i = 0;
            i < tapCount;
            i++
          ) {
            gameEngine.handleTap(
              username
            );
          }
        }
      );

      connection.on(
        'gift',
        (data: any) => {
          const username = String(
            data?.user?.uniqueId ||
              data?.uniqueId ||
              data?.user?.nickname ||
              data?.nickname ||
              'Spectator'
          ).replace(/^@/, '');

          const giftName = String(
            data?.giftName || 'Rose'
          );

          const repeatCount =
            Math.max(
              1,
              Number(
                data?.repeatCount || 1
              )
            );

          const diamondCount =
            Number(
              data?.diamondCount || 0
            );

          const coinValue =
            diamondCount > 0
              ? diamondCount * 2
              : 1;

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
        }
      );

      connection.on(
        'error',
        (err: any) => {
          console.error(
            '[TikTok] CONNECTION ERROR:',
            err?.message ||
              err?.error ||
              err
          );
        }
      );

      connection.on(
        'disconnected',
        (
          code: any,
          reason: any
        ) => {
          tiktokConnected = false;
          tiktokRoomId = null;

          console.log(
            `[TikTok] Disconnected from @${TIKTOK_USERNAME}. code=${code ?? 'unknown'} reason=${reason ?? ''}`
          );

          scheduleTikTokReconnect(
            10000
          );
        }
      );

      await connection.connect();
    } catch (err: any) {
      tiktokConnected = false;
      tiktokRoomId = null;

      console.error(
        `[TikTok] CONNECT FAILED @${TIKTOK_USERNAME}:`,
        err?.message || err
      );

      scheduleTikTokReconnect(
        30000
      );
    }
  };

  // Only connect directly to TikTok when
  // Render is configured for local mode.
  if (
    TIKTOK_CONNECTOR_MODE === 'local'
  ) {
    connectToTikTok();
  } else {
    console.log(
      '[TikTok] Local connector disabled; using Oracle remote connector.'
    );
  }

  // VITE / PRODUCTION
  // ==========================================

  if (
    process.env.NODE_ENV !== 'production'
  ) {
    const vite =
      await createViteServer({
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
