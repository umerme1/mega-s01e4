import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { NightNotFound, readNight } from '../src/digest/index.js';

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight('runs', '2026-10-28');
  const row = (job: string) => night.rows.find((r) => r.job === job);

  it('has 5 jobs, sorted, and 1 bad line', () => {
    expect(night.night).toBe('2026-10-28');
    expect(night.rows).toHaveLength(5);
    expect(night.badLines).toBe(1);
    const jobs = night.rows.map((r) => r.job);
    expect(jobs).toEqual([...jobs].sort());
  });

  it('counts retries and takes the last status', () => {
    expect(row('fixtures/refresh')).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: null });
  });

  it('keeps the last error and the offset in times', () => {
    expect(row('notes/backup')).toMatchObject({
      lastStatus: 'fail',
      lastError: 'quota exceeded',
      first: '2026-10-29T04:00:01+01:00',
      last: '2026-10-29T04:00:01+01:00',
    });
  });

  it('keeps a null owner', () => {
    expect(row('digest/render')?.owner).toBeNull();
  });
});

describe('readNight edge cases', () => {
  let dir: string | undefined;
  const tmp = () => (dir = mkdtempSync(join(tmpdir(), 'rig-digest-')));
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it('throws NightNotFound for a night with no file', () => {
    const d = tmp();
    expect(() => readNight(d, '2026-01-01')).toThrow(NightNotFound);
    try {
      readNight(d, '2026-01-01');
    } catch (err) {
      expect(err instanceof NightNotFound && err.night).toBe('2026-01-01');
    }
  });

  it('reads an empty file as no rows and no bad lines', () => {
    const d = tmp();
    writeFileSync(join(d, '2026-01-02.jsonl'), '');
    expect(readNight(d, '2026-01-02')).toEqual({ night: '2026-01-02', rows: [], badLines: 0 });
  });

  it('ignores blank lines and counts invalid fields as bad', () => {
    const d = tmp();
    const lines = [
      '{"at":"2026-01-03T01:00:00+02:00","job":"a","status":"ok","owner":"x"}',
      '',
      '{"at":"2026-01-03T01:00:00+02:00","job":"a","status":"maybe","owner":"x"}',
      '{"at":"2026-01-03T01:00:00+02:00","job":"a","status":"ok"}',
      '[]',
    ];
    writeFileSync(join(d, '2026-01-03.jsonl'), lines.join('\n') + '\n');
    const n = readNight(d, '2026-01-03');
    expect(n.badLines).toBe(3);
    expect(n.rows).toHaveLength(1);
  });
});
