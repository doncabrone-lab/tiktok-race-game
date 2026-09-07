import { Server, Socket } from 'socket.io';
import { GameEngine } from './gameEngine.ts';
import { getUser } from './db.ts';
import { WebcastPushConnection } from 'tiktok-live-connector';

export class TikTokConnector {
  private io: Server;
  private gameEngine: GameEngine;
  private isConnected: boolean = false;
  private targetRoomId: string = 'patronizzle';
  private tiktokLiveConnection: WebcastPushConnection | null = null;

  constructor(io: Server, gameEngine: GameEngine) {
    this.io = io;
    this.gameEngine = gameEngine;

    // Start direct de verbinding met patronizzle
    this.connectToTikTok('patronizzle');
  }

  public connectToTikTok(username: string) {
    const cleanUsername = username.replace(/^@/, '').trim();
    this.targetRoomId = cleanUsername;

    if (this.tiktokLiveConnection) {
      this.tiktokLiveConnection.disconnect();
    }

    this.tiktokLiveConnection = new WebcastPushConnection(cleanUsername);

    this.tiktokLiveConnection.connect()
      .then((state) => {
        this.isConnected = true;
        console.log(`[TikTok] Succesvol verbonden met TikTok LIVE van @${cleanUsername} (Room ID: ${state.roomId})`);
      })
      .catch((err) => {
        this.isConnected = false;
        console.error(`[TikTok] Fout bij verbinden met @${cleanUsername}:`, err);
      });

    // 1. LUISTER NAAR TAPS (LIKES)
    this.tiktokLiveConnection.on('like', (data) => {
      const username = data.uniqueId;
      const likeCount = data.likeCount || 1;
      this.gameEngine.handleTap(username, likeCount);
    });

    // 2. LUISTER NAAR GIFTS
    this.tiktokLiveConnection.on('gift', (data) => {
      if (data.giftType === 1 && data.repeatEnd) {
        this.gameEngine.handleGift(data.uniqueId, data.giftName, data.repeatCount);
      } else if (data.giftType !== 1) {
        this.gameEngine.handleGift(data.uniqueId, data.giftName, data.diamondCount);
      }
    });

    // 3. LUISTER NAAR CHAT BERICHTEN
    this.tiktokLiveConnection.on('chat', async (data) => {
      await this.handleChatMessage(data.uniqueId, data.comment);
    });

    this.tiktokLiveConnection.on('streamEnd', () => {
      this.isConnected = false;
      console.log(`[TikTok] Stream van @${cleanUsername} is beëindigd.`);
    });
  }

  public async handleChatMessage(username: string, message: string): Promise<string | null> {
    if (!message) return null;
    const cleanUser = username ? username.replace(/^@/, '').trim() : 'Spectator';
    const trimmed = message.trim();

    if (trimmed.toLowerCase().startsWith('!wins')) {
      const parts = trimmed.split(/\s+/);
      const targetUser = parts[1] ? parts[1].replace(/^@/, '').trim() : cleanUser;
      const user = await getUser(targetUser);
      const wins = user.wins_count ?? user.wins ?? 0;
      const now = Date.now();
      const reply = `@${targetUser} | ${wins} Wins`;

      this.gameEngine.broadcastChatMessage({
        id: 'wins_' + now,
        username: targetUser,
        message: reply,
        type: 'chat',
        timestamp: now,
      });

      return reply;
    }

    await this.gameEngine.handleCommand(cleanUser, trimmed);
    return null;
  }

  public registerSocketEvents(socket: Socket): void {
    socket.on('chat:send', async (data: { username: string; message: string; isBroadcaster?: boolean }) => {
      if (!data || !data.message) return;
      await this.handleChatMessage(data.username || 'Spectator', data.message);
    });

    socket.on('chat:message', async (data: { username: string; message: string }) => {
      if (!data || !data.message) return;
      await this.handleChatMessage(data.username || 'Spectator', data.message);
    });

    socket.on('tiktok:chat', async (data: { username: string; message: string }) => {
      if (!data || !data.message) return;
      await this.handleChatMessage(data.username || 'Spectator', data.message);
    });

    socket.on('command:wins', async (data: { username: string }) => {
      const username = data?.username || 'Spectator';
      await this.handleChatMessage(username, '!wins');
    });

    socket.on('host:set_id', (data: { hostId: string }) => {
      if (data?.hostId) {
        this.connectToTikTok(data.hostId);
      }
    });
  }

  public setConnected(connected: boolean, roomId: string = ''): void {
    this.isConnected = connected;
    this.targetRoomId = roomId;
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      roomId: this.targetRoomId,
    };
  }
}
