import { fileURLToPath } from 'node:url';
import { mkdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const release = path.join(root, 'dist'); await mkdir(release, { recursive: true });
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const zip = path.join(release, `whatsapp-local-translator-${manifest.version}.zip`);
const files = ['manifest.json', ...manifest.content_scripts[0].js, 'popup.html', 'popup.css', 'README.md', 'PRIVACY.md', 'CHANGELOG.md', 'VALIDATION.md', 'LICENSE'];
const script = `
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stream = [System.IO.File]::Open($env:WAT_PACKAGE_ZIP, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($name in ($env:WAT_PACKAGE_FILES | ConvertFrom-Json)) {
    $source = Join-Path $env:WAT_PACKAGE_ROOT $name
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $source, $name) | Out-Null
  }
} finally { $archive.Dispose(); $stream.Dispose() }
`;
const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
  env: { ...process.env, WAT_PACKAGE_ROOT: root, WAT_PACKAGE_ZIP: zip, WAT_PACKAGE_FILES: JSON.stringify(files) }, encoding: 'utf8'
});
if (result.status !== 0) throw new Error(result.stderr || 'Packaging failed');
console.log(zip);
