import { randomUUID } from 'node:crypto';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { ChatSessionMessage, CreateChatSessionInput, UpdateChatSessionInput } from './chat-session.schema.js';

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatSessionMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  messageCount: number;
  latestMessage: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatSessionRow {
  id: string;
  title: string;
  messages: string;
  created_at: string;
  updated_at: string;
}

function toSession(row: ChatSessionRow): ChatSession {
  return {
    id: row.id,
    title: row.title,
    messages: JSON.parse(row.messages) as ChatSessionMessage[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSummary(row: ChatSessionRow): ChatSessionSummary {
  const session = toSession(row);
  const latestMessage = [...session.messages].reverse().find((message) => !message.hidden)?.content ?? '';

  return {
    id: session.id,
    title: session.title,
    messageCount: session.messages.filter((message) => !message.hidden).length,
    latestMessage,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function createDefaultTitle(messages: ChatSessionMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === 'user' && !message.hidden)?.content.trim();
  if (!firstUserMessage) {
    return '新会话';
  }

  return firstUserMessage.length > 24 ? `${firstUserMessage.slice(0, 24)}...` : firstUserMessage;
}

export class ChatSessionRepository {
  constructor(private readonly database: DatabaseType) {}

  list(): ChatSessionSummary[] {
    return this.database
      .prepare('SELECT * FROM chat_sessions ORDER BY updated_at DESC')
      .all()
      .map((row) => toSummary(row as ChatSessionRow));
  }

  findById(id: string): ChatSession | undefined {
    const row = this.database.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(id) as ChatSessionRow | undefined;
    return row ? toSession(row) : undefined;
  }

  create(input: CreateChatSessionInput): ChatSession {
    const id = randomUUID();
    const now = new Date().toISOString();
    const title = input.title ?? createDefaultTitle(input.messages);

    this.database
      .prepare(
        `
          INSERT INTO chat_sessions (id, title, messages, created_at, updated_at)
          VALUES (@id, @title, @messages, @created_at, @updated_at)
        `
      )
      .run({
        id,
        title,
        messages: JSON.stringify(input.messages),
        created_at: now,
        updated_at: now,
      });

    return this.findById(id) as ChatSession;
  }

  update(id: string, input: UpdateChatSessionInput): ChatSession | undefined {
    const current = this.findById(id);
    if (!current) {
      return undefined;
    }

    const messages = input.messages ?? current.messages;
    const title = input.title ?? current.title;

    this.database
      .prepare(
        `
          UPDATE chat_sessions
          SET title = @title, messages = @messages, updated_at = @updated_at
          WHERE id = @id
        `
      )
      .run({
        id,
        title,
        messages: JSON.stringify(messages),
        updated_at: new Date().toISOString(),
      });

    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.database.prepare('DELETE FROM chat_sessions WHERE id = ?').run(id);
    return result.changes > 0;
  }

  deleteMany(ids: string[]): number {
    const deleteSession = this.database.prepare('DELETE FROM chat_sessions WHERE id = ?');
    const transaction = this.database.transaction((sessionIds: string[]) => {
      let changes = 0;
      for (const id of sessionIds) {
        changes += deleteSession.run(id).changes;
      }

      return changes;
    });

    return transaction(ids);
  }
}
