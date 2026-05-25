import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ICONS_DIR = resolve(ROOT, 'src-tauri', 'icons');
const LOGO_PNG = resolve(ROOT, 'frontend', 'public', 'images', 'logo.png');

if (!existsSync(LOGO_PNG)) {
  console.error('Logo not found at', LOGO_PNG);
  console.log('Creating placeholder icon directory...');
  mkdirSync(ICONS_DIR, { recursive: true });
  process.exit(1);
}

if (!existsSync(ICONS_DIR)) {
  mkdirSync(ICONS_DIR, { recursive: true });
}

const sizes = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
];

console.log('[generate-icons] Generating PNG icons...');

for (const { name, size } of sizes) {
  execSync(
    `npx sharp "${LOGO_PNG}" --resize ${size} ${size} --output "${resolve(ICONS_DIR, name)}"`,
    { stdio: 'inherit' }
  );
  console.log(`  Created ${name}`);
}

console.log('[generate-icons] Generating macOS .icns...');
try {
  execSync(
    `npx sharp "${LOGO_PNG}" --resize 512 512 --output "${resolve(ICONS_DIR, 'icon-512.png')}"`,
    { stdio: 'inherit' }
  );

  const iconsetDir = resolve(ICONS_DIR, 'FindMyHouse.iconset');
  mkdirSync(iconsetDir, { recursive: true });

  execSync(
    `npx sharp "${LOGO_PNG}" --resize 16 16 --output "${resolve(iconsetDir, 'icon_16x16.png')}"`,
    { stdio: 'inherit' }
  );
  execSync(
    `npx sharp "${LOGO_PNG}" --resize 32 32 --output "${resolve(iconsetDir, 'icon_16x16@2x.png')}"`,
    { stdio: 'inherit' }
  );
  execSync(
    `npx sharp "${LOGO_PNG}" --resize 32 32 --output "${resolve(iconsetDir, 'icon_32x32.png')}"`,
    { stdio: 'inherit' }
  );
  execSync(
    `npx sharp "${LOGO_PNG}" --resize 64 64 --output "${resolve(iconsetDir, 'icon_32x32@2x.png')}"`,
    { stdio: 'inherit' }
  );
  execSync(
    `npx sharp "${LOGO_PNG}" --resize 128 128 --output "${resolve(iconsetDir, 'icon_128x128.png')}"`,
    { stdio: 'inherit' }
  );
  execSync(
    `npx sharp "${LOGO_PNG}" --resize 256 256 --output "${resolve(iconsetDir, 'icon_128x128@2x.png')}"`,
    { stdio: 'inherit' }
  );
  execSync(
    `npx sharp "${LOGO_PNG}" --resize 256 256 --output "${resolve(iconsetDir, 'icon_256x256.png')}"`,
    { stdio: 'inherit' }
  );
  execSync(
    `npx sharp "${LOGO_PNG}" --resize 512 512 --output "${resolve(iconsetDir, 'icon_256x256@2x.png')}"`,
    { stdio: 'inherit' }
  );
  execSync(
    `npx sharp "${LOGO_PNG}" --resize 512 512 --output "${resolve(iconsetDir, 'icon_512x512.png')}"`,
    { stdio: 'inherit' }
  );
  execSync(
    `npx sharp "${LOGO_PNG}" --resize 1024 1024 --output "${resolve(iconsetDir, 'icon_512x512@2x.png')}"`,
    { stdio: 'inherit' }
  );

  execSync(`iconutil -c icns "${iconsetDir}" -o "${resolve(ICONS_DIR, 'icon.icns')}"`, {
    stdio: 'inherit',
  });
  console.log('  Created icon.icns');

  execSync(`rm -rf "${iconsetDir}" "${resolve(ICONS_DIR, 'icon-512.png')}"`);
} catch (e) {
  console.log('  Skipping .icns generation (not on macOS or iconutil not available)');
  copyFileSync(LOGO_PNG, resolve(ICONS_DIR, 'icon.icns'));
}

console.log('[generate-icons] Generating Windows .ico...');
try {
  execSync(
    `npx sharp "${LOGO_PNG}" --resize 256 256 --output "${resolve(ICONS_DIR, 'icon-temp.png')}"`,
    { stdio: 'inherit' }
  );
  execSync(
    `npx png-to-ico "${resolve(ICONS_DIR, 'icon-temp.png')}" > "${resolve(ICONS_DIR, 'icon.ico')}"`,
    { stdio: 'inherit' }
  );
  execSync(`rm -f "${resolve(ICONS_DIR, 'icon-temp.png')}"`);
  console.log('  Created icon.ico');
} catch {
  console.log('  Skipping .ico generation (png-to-ico not available)');
  copyFileSync(LOGO_PNG, resolve(ICONS_DIR, 'icon.ico'));
}

console.log('[generate-icons] All icons generated!');
