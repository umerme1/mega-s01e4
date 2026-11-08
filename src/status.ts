import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { readNight } from './digest/index.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightSummary[];
};

// counts is null when the night's log could not be read (rendered as —).
export type NightSummary = {
  night: string;
  counts: { ok: number; retry: number; fail: number; badLines: number } | null;
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

// One count per job, by its last status.
export function summarizeNight(runsDir: string, night: string): NightSummary {
  try {
    const { rows, badLines } = readNight(runsDir, night);
    const count = (s: 'ok' | 'retry' | 'fail') => rows.filter((r) => r.lastStatus === s).length;
    return { night, counts: { ok: count('ok'), retry: count('retry'), fail: count('fail'), badLines } };
  } catch {
    return { night, counts: null };
  }
}

export function readStatus(config: RigConfig): Status {
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights: nightsOnDisk(config.runsDir).map((n) => summarizeNight(config.runsDir, n)),
  };
}
