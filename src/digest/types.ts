// The digest's shapes. No logic here: section 2 builds against these.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job for a night. `first` / `last` are the `at` strings exactly as logged
// (offset kept, never converted to UTC).
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  first: string;
  last: string;
};

// A night's digest: rows sorted by job, plus how many lines did not parse.
export type Night = {
  night: string;
  rows: DigestRow[];
  badLines: number;
};

// Reads <runsDir>/<night>.jsonl. Throws NightNotFound when the file is missing.
export type ReadNight = (runsDir: string, night: string) => Night;
