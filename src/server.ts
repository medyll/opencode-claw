import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

// --- Types ---

interface Project {
  id: string;
  name: string;
  path: string;
  description: string;
  status: 'active' | 'running' | 'error';
  lastRun: string | null;
  createdAt: string;
}

interface ProjectsFile {
  projects: Project[];
}

interface QueueFile {
  queue: string[];
  running: boolean;
  lastExecution: string | null;
}

interface Execution {
  id: string;
  projectId: string;
  projectName: string;
  status: 'success' | 'error';
  duration: number;
  error: string | null;
  startedAt: string;
  completedAt: string;
}

interface ExecutionsFile {
  executions: Execution[];
}

// --- Config ---

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const OPENCODE_URL = process.env.OPENCODE_URL ?? 'http://localhost:4096';
const CSS_BASE_PATH = process.env.CSS_BASE_PATH
  ?? path.join(__dirname, '../../node_modules/@medyll/css-base/dist');
const DATA_DIR = path.join(__dirname, 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const QUEUE_FILE = path.join(DATA_DIR, 'queue.json');
const EXECUTIONS_FILE = path.join(DATA_DIR, 'executions.json');

app.use(express.json());
app.use('/css-base', express.static(CSS_BASE_PATH));
app.use(express.static(path.join(__dirname, '../public')));

// --- Persistence ---

function readJSON<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      console.error(`[IO] Failed to read ${file}:`, e.message);
    }
    return null;
  }
}

function writeJSON(file: string, data: unknown): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// --- Project helpers ---

function getProjectById(id: string): Project | null {
  const data = readJSON<ProjectsFile>(PROJECTS_FILE);
  return data?.projects.find(p => p.id === id) ?? null;
}

function updateProjectStatus(id: string, status: Project['status'], lastRun?: string): void {
  const data = readJSON<ProjectsFile>(PROJECTS_FILE) ?? { projects: [] };
  const project = data.projects.find(p => p.id === id);
  if (project) {
    project.status = status;
    if (lastRun) project.lastRun = lastRun;
    writeJSON(PROJECTS_FILE, data);
  }
}

// --- Queue runner ---

let executionInterval: NodeJS.Timeout | null = null;

function startQueueRunner(): void {
  if (executionInterval) return;
  console.log('[Runner] Queue runner started');

  executionInterval = setInterval(async () => {
    const queueData = readJSON<QueueFile>(QUEUE_FILE);
    if (!queueData || queueData.running || queueData.queue.length === 0) return;

    queueData.running = true;
    writeJSON(QUEUE_FILE, queueData);

    const projectId = queueData.queue[0];
    const project = getProjectById(projectId);

    if (!project) {
      console.log(`[Runner] Project ${projectId} not found, removing from queue`);
      queueData.queue.shift();
      queueData.running = false;
      writeJSON(QUEUE_FILE, queueData);
      return;
    }

    const startedAt = new Date().toISOString();
    console.log(`[Runner] Starting execution: ${project.name}`);
    updateProjectStatus(projectId, 'running');

    try {
      const duration = await executeProject(project);
      console.log(`[Runner] Completed: ${project.name}`);
      const completedAt = new Date().toISOString();
      updateProjectStatus(projectId, 'active', completedAt);
      logExecution(project, 'success', duration, startedAt, completedAt);
    } catch (error: any) {
      const completedAt = new Date().toISOString();
      console.error(`[Runner] Error executing ${project.name}:`, error.message);
      updateProjectStatus(projectId, 'error', completedAt);
      logExecution(project, 'error', 0, startedAt, completedAt, error.message);
    }

    queueData.queue.shift();
    queueData.running = false;
    queueData.lastExecution = new Date().toISOString();
    writeJSON(QUEUE_FILE, queueData);
  }, 3000);
}

function stopQueueRunner(): void {
  if (executionInterval) {
    clearInterval(executionInterval);
    executionInterval = null;
    console.log('[Runner] Queue runner stopped');
  }
}

function logExecution(
  project: Project,
  status: Execution['status'],
  duration: number,
  startedAt: string,
  completedAt: string,
  error?: string
): void {
  const data = readJSON<ExecutionsFile>(EXECUTIONS_FILE) ?? { executions: [] };
  const execution: Execution = {
    id: `exec-${Date.now()}`,
    projectId: project.id,
    projectName: project.name,
    status,
    duration,
    error: error ?? null,
    startedAt,
    completedAt,
  };
  data.executions.unshift(execution);
  data.executions = data.executions.slice(0, 100);
  writeJSON(EXECUTIONS_FILE, data);
  console.log(`[Runner] Execution logged: ${project.name} — ${status} (${duration}ms)`);
}

function executeProject(project: Project): Promise<number> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    console.log(`[Runner] Spawning opencode for: ${project.name} at ${project.path}`);

    const child = spawn('opencode', ['run'], {
      cwd: project.path,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (d: Buffer) => console.log(`[${project.name}]`, d.toString().trimEnd()));
    child.stderr.on('data', (d: Buffer) => console.error(`[${project.name}]`, d.toString().trimEnd()));

    child.on('close', code => {
      const duration = Date.now() - startTime;
      if (code === 0) {
        resolve(duration);
      } else {
        reject(new Error(`opencode exited with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

// --- Routes ---

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'codeclaw',
    port: PORT,
    opencode: OPENCODE_URL,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/projects', (req, res) => {
  const data = readJSON<ProjectsFile>(PROJECTS_FILE);
  res.json(data ?? { projects: [] });
});

app.post('/api/projects', (req, res) => {
  const { name, path: projectPath, description } = req.body as Record<string, string>;

  if (!name || !projectPath) {
    return res.status(400).json({ error: 'name and path are required' });
  }

  const data = readJSON<ProjectsFile>(PROJECTS_FILE) ?? { projects: [] };
  const newProject: Project = {
    id: `proj-${Date.now()}`,
    name,
    path: projectPath,
    description: description ?? '',
    status: 'active',
    lastRun: null,
    createdAt: new Date().toISOString(),
  };

  data.projects.push(newProject);
  writeJSON(PROJECTS_FILE, data);
  res.status(201).json(newProject);
});

app.get('/api/queue', (req, res) => {
  const data = readJSON<QueueFile>(QUEUE_FILE);
  res.json(data ?? { queue: [], running: false });
});

app.post('/api/queue', (req, res) => {
  const { projectId, action } = req.body as { projectId?: string; action?: string };
  const data = readJSON<QueueFile>(QUEUE_FILE) ?? { queue: [], running: false, lastExecution: null };

  if (action === 'add' && projectId) {
    if (!data.queue.includes(projectId)) data.queue.push(projectId);
  } else if (action === 'remove' && projectId) {
    data.queue = data.queue.filter(id => id !== projectId);
  } else if (action === 'clear') {
    data.queue = [];
  } else if (action === 'start') {
    startQueueRunner();
  } else if (action === 'stop') {
    stopQueueRunner();
  } else {
    return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  writeJSON(QUEUE_FILE, data);
  res.json(data);
});

app.post('/api/queue/run', (req, res) => {
  startQueueRunner();
  res.json({ status: 'started' });
});

app.post('/api/queue/stop', (req, res) => {
  stopQueueRunner();
  res.json({ status: 'stopped' });
});

app.get('/api/executions', (req, res) => {
  const data = readJSON<ExecutionsFile>(EXECUTIONS_FILE);
  const { projectId, limit = '50' } = req.query as Record<string, string>;
  let executions = data?.executions ?? [];

  if (projectId) {
    executions = executions.filter(e => e.projectId === projectId);
  }

  res.json({ executions: executions.slice(0, Math.min(Number(limit), 200)) });
});

app.get('/api/executions/summary', (req, res) => {
  const data = readJSON<ExecutionsFile>(EXECUTIONS_FILE);
  const executions = data?.executions ?? [];

  const today = new Date().toDateString();
  const todayExecutions = executions.filter(e => new Date(e.startedAt).toDateString() === today);

  res.json({
    total: executions.length,
    today: todayExecutions.length,
    success: todayExecutions.filter(e => e.status === 'success').length,
    error: todayExecutions.filter(e => e.status === 'error').length,
    lastExecution: executions[0]?.startedAt ?? null,
  });
});

app.listen(PORT, () => {
  console.log(`[CodeClaw] Serveur démarré sur http://localhost:${PORT}`);
  console.log(`[CodeClaw] Opencode: ${OPENCODE_URL}`);
  console.log(`[CodeClaw] CSS Base: ${CSS_BASE_PATH}`);
  console.log(`[CodeClaw] Data dir: ${DATA_DIR}`);
});
