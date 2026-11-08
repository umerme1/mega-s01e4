import { Hono } from 'hono';
import { NightNotFound, readNight } from './digest/index.js';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/api/digest/:night', (c) => {
    const night = c.req.param('night');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return c.json({ error: 'no such night', night }, 404);
    try {
      return c.json(readNight(config.runsDir, night));
    } catch (e) {
      if (e instanceof NightNotFound) return c.json({ error: 'no such night', night }, 404);
      throw e;
    }
  });

  return app;
}
