import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, readdirSync, renameSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arch, platform } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BACKEND = resolve(ROOT, 'backend');
const BINARIES_DIR = resolve(ROOT, 'src-tauri', 'binaries');
const TARGET_DIR = resolve(ROOT, 'target', 'backend-bundle');

function getTargetTriple() {
  const os = platform();
  const cpu = arch();

  if (os === 'darwin' && cpu === 'arm64') return 'aarch64-apple-darwin';
  if (os === 'darwin' && cpu === 'x64') return 'x86_64-apple-darwin';
  if (os === 'linux' && cpu === 'x64') return 'x86_64-unknown-linux-gnu';
  if (os === 'linux' && cpu === 'arm64') return 'aarch64-unknown-linux-gnu';
  if (os === 'win32' && cpu === 'x64') return 'x86_64-pc-windows-msvc';

  throw new Error(`Unsupported platform: ${os} ${cpu}`);
}

function getExecutableName() {
  return platform() === 'win32' ? 'backend.exe' : 'backend';
}

function log(...args) {
  console.log(`[build-backend]`, ...args);
}

async function build() {
  const targetTriple = getTargetTriple();
  log(`Target triple: ${targetTriple}`);
  log(`Platform: ${platform()} ${arch()}`);

  if (!existsSync(TARGET_DIR)) {
    mkdirSync(TARGET_DIR, { recursive: true });
  }

  log('Step 1: Compiling TypeScript...');
  execSync('npx tsc -p tsconfig.json', { cwd: BACKEND, stdio: 'inherit' });

  log('Step 2: Bundling with esbuild...');
  execSync(
    `npx esbuild src/main.ts --bundle --platform=node --target=node20 --outfile=bundle.cjs --external:better-sqlite3 --external:./node_modules/*.node --tsconfig=tsconfig.json`,
    { cwd: BACKEND, stdio: 'inherit' }
  );

  log('Step 3: Copying native modules...');
  const nativeModulesDir = resolve(BACKEND, 'node_modules', 'better-sqlite3', 'build', 'Release');
  const nativeFiles = readdirSync(nativeModulesDir).filter(f => f.endsWith('.node'));
  for (const file of nativeFiles) {
    copyFileSync(resolve(nativeModulesDir, file), resolve(TARGET_DIR, file));
  }

  log('Step 4: Packaging with pkg...');
  const pkgOutput = resolve(TARGET_DIR, getExecutableName());

  try {
    execSync(
      `npx @yao-pkg/pkg bundle.cjs --target node20-${targetTriple} --output ${pkgOutput} --compress Brotli`,
      { cwd: BACKEND, stdio: 'inherit' }
    );
  } catch {
    log('pkg with target failed, trying node20-host...');
    execSync(
      `npx @yao-pkg/pkg bundle.cjs --target node20 --output ${pkgOutput} --compress Brotli`,
      { cwd: BACKEND, stdio: 'inherit' }
    );
  }

  log('Step 5: Copying to Tauri binaries directory...');
  if (!existsSync(BINARIES_DIR)) {
    mkdirSync(BINARIES_DIR, { recursive: true });
  }

  const tauriBinaryName = `${getExecutableName().replace(/\.[^.]+$/, '')}-${targetTriple}${platform() === 'win32' ? '.exe' : ''}`;
  const tauriBinaryPath = resolve(BINARIES_DIR, tauriBinaryName);

  if (existsSync(pkgOutput)) {
    copyFileSync(pkgOutput, tauriBinaryPath);
    log(`Copied to ${tauriBinaryPath}`);

    if (platform() !== 'win32') {
      execSync(`chmod +x "${tauriBinaryPath}"`);
    }
  } else {
    throw new Error(`pkg output not found at ${pkgOutput}`);
  }

  log('Backend sidecar build complete!');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
