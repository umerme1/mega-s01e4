import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const JOBS = ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs'];

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
  process.env.LANE_MARKER = 'TEST-MARKER';
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function app() {
  return createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir: dir,
  });
}

function jobCells(html: string): string[] {
  return [...html.matchAll(/<tr[^>]*><td>([^<]*)<\/td>/g)].map((m) => m[1]!);
}

describe('GET /digest/:night and /api/digest/:night', () => {
  it('200 for a night with a file', async () => {
    copyFileSync(join('runs', '2026-10-28.jsonl'), join(dir, '2026-10-28.jsonl'));

    const page = await app().request('/digest/2026-10-28');
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    for (const job of JOBS) expect(html).toContain(job);
    expect(html).toMatch(/<tr class="warn"><td>notes\/backup<\/td>/);

    const api = await app().request('/api/digest/2026-10-28');
    expect(api.status).toBe(200);
    const body = (await api.json()) as { rows: unknown[]; badLines: number };
    expect(body.rows).toHaveLength(5);
    expect(body.badLines).toBe(1);
  });

  it('404 for a night with no file, and for a malformed night', async () => {
    for (const path of ['/digest/2026-10-28', '/digest/abc']) {
      expect((await app().request(path)).status).toBe(404);
    }
    for (const path of ['/api/digest/2026-10-28', '/api/digest/abc']) {
      const res = await app().request(path);
      expect(res.status).toBe(404);
      expect(await res.json()).toHaveProperty('error');
    }
  });

  it('the empty night says nothing ran', async () => {
    writeFileSync(join(dir, '2026-10-30.jsonl'), '');

    const page = await app().request('/digest/2026-10-30');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');

    const api = await app().request('/api/digest/2026-10-30');
    expect(api.status).toBe(200);
    expect(await api.json()).toMatchObject({ rows: [], badLines: 0 });
  });

  it('a night with a bad line still renders and counts it', async () => {
    writeFileSync(
      join(dir, '2026-10-31.jsonl'),
      [
        '{"at":"2026-10-31T01:00:00+01:00","job":"a/one","status":"ok","owner":"rook"}',
        'not json at all',
        '{"at":"2026-10-31T02:00:00+01:00","job":"b/two","status":"ok","owner":null}',
      ].join('\n') + '\n',
    );

    const page = await app().request('/digest/2026-10-31');
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(html).toContain('1 line did not parse');
    expect(jobCells(html)).toEqual(['a/one', 'b/two']);

    const api = await app().request('/api/digest/2026-10-31');
    const body = (await api.json()) as { rows: unknown[]; badLines: number };
    expect(body.badLines).toBe(1);
    expect(body.rows).toHaveLength(2);
  });

  it('page and JSON agree on job order', async () => {
    copyFileSync(join('runs', '2026-10-28.jsonl'), join(dir, '2026-10-28.jsonl'));

    const html = await (await app().request('/digest/2026-10-28')).text();
    const body = (await (await app().request('/api/digest/2026-10-28')).json()) as {
      rows: { job: string }[];
    };
    expect(jobCells(html)).toEqual(body.rows.map((r) => r.job));
  });
});
