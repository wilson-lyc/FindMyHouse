import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFiles = [resolve(__dirname, '../../../.env'), resolve(__dirname, '../../.env')];

function parseEnvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return;
  }

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex === -1) {
    return;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  if (key && process.env[key] === undefined) {
    process.env[key] = value;
  }
}

export function loadEnvFiles() {
  for (const envFile of envFiles) {
    if (!existsSync(envFile)) {
      continue;
    }

    const content = readFileSync(envFile, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      parseEnvLine(line);
    }
  }
}
