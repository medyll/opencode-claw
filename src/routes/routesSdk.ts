import { Router, Request, Response, IRouter } from 'express';
import { createOpencodeClient } from '@opencode-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

const router: IRouter = Router();

const OPENCODE_URL = process.env.OPENCODE_URL ?? 'http://localhost:4096';

function ocClient(directory?: string) {
  return createOpencodeClient({ baseUrl: OPENCODE_URL, directory });
}

function id(req: Request): string {
  return String(req.params.id);
}

// --- Session persistence with priority ---

interface SessionMeta {
  id: string;
  projectId: string;
  directory: string;
  title: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  lastActivity: string;
  createdAt: string;
}

interface SessionsFile {
  sessions: SessionMeta[];
}

function readSessions(): SessionsFile {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
  } catch {
    return { sessions: [] };
  }
}

function writeSessions(data: SessionsFile): void {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2));
}

function findSessionMeta(sessionId: string): SessionMeta | null {
  const data = readSessions();
  return data.sessions.find(s => s.id === sessionId) ?? null;
}

function updateSessionMeta(sessionId: string, updates: Partial<SessionMeta>): void {
  const data = readSessions();
  const idx = data.sessions.findIndex(s => s.id === sessionId);
  if (idx >= 0) {
    data.sessions[idx] = { ...data.sessions[idx], ...updates };
    writeSessions(data);
  }
}

function createSessionMeta(sessionId: string, projectId: string, directory: string, title: string): SessionMeta {
  const meta: SessionMeta = {
    id: sessionId,
    projectId,
    directory,
    title,
    priority: 'normal',
    lastActivity: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  const data = readSessions();
  data.sessions.push(meta);
  writeSessions(data);
  return meta;
}

// Decay priority for sessions inactive > 5 min
function decayPriorities(): void {
  const data = readSessions();
  const now = Date.now();
  const fiveMin = 5 * 60 * 1000;
  let changed = false;
  
  data.sessions.forEach(s => {
    const last = new Date(s.lastActivity).getTime();
    if (now - last > fiveMin && s.priority !== 'low') {
      s.priority = 'low';
      changed = true;
    }
  });
  
  if (changed) writeSessions(data);
}

// Run decay every 2 minutes
setInterval(decayPriorities, 2 * 60 * 1000);

// GET /api/oc/sessions?directory=<path>&projectId=<id>
router.get('/sessions', async (req: Request, res: Response) => {
  const directory = req.query.directory as string | undefined;
  const projectId = req.query.projectId as string | undefined;
  try {
    const oc = ocClient(directory);
    const result = await oc.session.list({ query: directory ? { directory } : {} });
    let sessions = result.data ?? [];
    
    // If projectId provided, filter sessions by matching directory
    if (projectId && directory) {
      sessions = sessions.filter(s => s.directory === directory);
    }
    
    // Enrich with priority metadata
    const meta = readSessions();
    const enriched = sessions.map(s => {
      const m = meta.sessions.find(ms => ms.id === s.id);
      return {
        ...s,
        priority: m?.priority ?? 'normal',
        lastActivity: m?.lastActivity ?? s.updatedAt,
      };
    });
    
    res.json(enriched);
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// POST /api/oc/sessions  { directory?, title?, projectId? }
router.post('/sessions', async (req: Request, res: Response) => {
  const { directory, title, projectId } = req.body as { directory?: string; title?: string; projectId?: string };
  try {
    const oc = ocClient(directory);
    const result = await oc.session.create({ body: { title } });
    const session = result.data;
    
    // Store metadata with priority
    if (session?.id && projectId && directory) {
      createSessionMeta(session.id, projectId, directory, title || 'Session');
    }
    
    res.status(201).json(session);
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// GET /api/oc/sessions/:id
router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const result = await ocClient().session.get({ path: { id: id(req) } });
    res.json(result.data);
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// GET /api/oc/sessions/:id/messages
router.get('/sessions/:id/messages', async (req: Request, res: Response) => {
  try {
    const result = await ocClient().session.messages({ path: { id: id(req) } });
    res.json(result.data ?? []);
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// POST /api/oc/sessions/:id/prompt  { parts, model? }
router.post('/sessions/:id/prompt', async (req: Request, res: Response) => {
  const { parts, model } = req.body;
  try {
    const result = await ocClient().session.promptAsync({
      path: { id: id(req) },
      body: { parts, model },
    });
    res.json(result.data);
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// DELETE /api/oc/sessions/:id
router.delete('/sessions/:id', async (req: Request, res: Response) => {
  try {
    await ocClient().session.delete({ path: { id: id(req) } });
    // Remove from meta
    const data = readSessions();
    data.sessions = data.sessions.filter(s => s.id !== id(req));
    writeSessions(data);
    res.status(204).end();
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// POST /api/oc/sessions/:id/priority  { priority: 'low'|'normal'|'high'|'urgent' }
router.post('/sessions/:id/priority', async (req: Request, res: Response) => {
  const { priority } = req.body as { priority: 'low' | 'normal' | 'high' | 'urgent' };
  if (!priority || !['low', 'normal', 'high', 'urgent'].includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority' });
  }
  try {
    updateSessionMeta(id(req), { priority, lastActivity: new Date().toISOString() });
    res.json({ success: true, priority });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/oc/events — SSE proxy (global event stream)
router.get('/events', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const oc = ocClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventApi = (oc as any).event as { event: () => Promise<{ stream: AsyncIterable<unknown> }> };
    const stream = await eventApi.event();

    for await (const evt of stream.stream) {
      if (req.closed) break;
      res.write(`data: ${JSON.stringify(evt)}\n\n`);
    }
  } catch (e: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: e.message })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
