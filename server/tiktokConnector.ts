import { Server, Socket } from 'socket.io';
import { GameEngine } from './gameEngine.ts';
import { getUser } from './db.ts';

/**
 * TikTok LIVE Connector
 * Bridge for TikTok Live chat stream, gifts, taps, and chat commands.
 * 
 * Strict Implementation of !wins Chat Command for Player Progression:
 * 1. Listen exclusively for `!wins`.
 * 2. Query sender's record in SQLite: `wins_count`, `player_level`, `xp_points`, and `jc_balance`.
 * 3. Identify NEXT locked skin tier requirement.
 * 4. Format compact response string:
 *    "@username | Wins: 8 | Level: 12 (450 XP) | Next Tier Req: 15 Wins & Level 15"
 * 5. Emit on-screen HUD pop-up inside the 15%-70% Safe Zone overlay.
 * 6. Strictly DO NOT implement !stats or !level; keep all status requests unified under !wins.
 */
export class TikTokConnector {
  private io: Server;
  private gameEngine: GameEngine;
  private isConnected: boolean = false;
  private targetRoomId: string = '';

  constructor(io: Server, gameEngine: GameEngine) {
    this.io = io;
    this.gameEngine = gameEngine;
  }

  /**
   * Process an incoming chat message from TikTok Live.
   * Evaluates commands and strictly triggers the !wins progression flow.
   */
  public async handleChatMessage(username: string, message: string): Promise<string | null> {
    if (!message) return null;
    const cleanUser = username ? username.replace(/^@/, '').trim() : 'Spectator';
    const trimmed = message.trim();

    // 1. CHAT COMMAND LISTENER (!wins):
    // Minimal reply back to the chat stream ONLY: "@username | X Wins"
    // No extra text about levels, XP, JC, or next tiers. No OBS overlay emission.
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

    // Forward any other message or non-status commands to the core game engine
    await this.gameEngine.handleCommand(cleanUser, trimmed);
    return null;
  }

  /**
   * Register socket handlers for a newly connected client.
   */
  public registerSocketEvents(socket: Socket): void {
    // Chat send event
    socket.on('chat:send', async (data: { username: string; message: string; isBroadcaster?: boolean }) => {
      if (!data || !data.message) return;
      await this.handleChatMessage(data.username || 'Spectator', data.message);
    });

    // Chat message event
    socket.on('chat:message', async (data: { username: string; message: string }) => {
      if (!data || !data.message) return;
      await this.handleChatMessage(data.username || 'Spectator', data.message);
    });

    // TikTok live chat event
    socket.on('tiktok:chat', async (data: { username: string; message: string }) => {
      if (!data || !data.message) return;
      await this.handleChatMessage(data.username || 'Spectator', data.message);
    });

    // Dedicated !wins command trigger
    socket.on('command:wins', async (data: { username: string }) => {
      const username = data?.username || 'Spectator';
      await this.handleChatMessage(username, '!wins');
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
