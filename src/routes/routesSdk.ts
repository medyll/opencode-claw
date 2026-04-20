import { Router, Request, Response, IRouter } from 'express';
import { createOpencodeClient } from '@opencode-ai/sdk';

const router: IRouter = Router();

const OPENCODE_URL = process.env.OPENCODE_URL ?? 'http://localhost:4096';

function ocClient(directory?: string) {
  return createOpencodeClient({ baseUrl: OPENCODE_URL, directory });
}

function id(req: Request): string {
  return String(req.params.id);
}

// GET /api/oc/sessions?directory=<path>
router.get('/sessions', async (req: Request, res: Response) => {
  const directory = req.query.directory as string | undefined;
  try {
    const oc = ocClient(directory);
    const result = await oc.session.list({ query: directory ? { directory } : {} });
    res.json(result.data ?? []);
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// POST /api/oc/sessions  { directory?, title? }
router.post('/sessions', async (req: Request, res: Response) => {
  const { directory, title } = req.body as { directory?: string; title?: string };
  try {
    const oc = ocClient(directory);
    const result = await oc.session.create({ body: { title } });
    res.status(201).json(result.data);
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
    res.status(204).end();
  } catch (e: any) {
    res.status(502).json({ error: e.message });
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
