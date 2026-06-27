import sharp from 'sharp';
import toIco from 'to-ico';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const sourcePath = join(root, 'public', 'logo-512.png');
const sourceBuffer = readFileSync(sourcePath);

const sizes = [16, 32, 48];
const pngBuffers = await Promise.all(
  sizes.map((size) =>
    sharp(sourceBuffer)
      .resize(size, size)
      .png()
      .toBuffer()
  )
);

const icoBuffer = await toIco(pngBuffers);
writeFileSync(join(root, 'public', 'favicon.ico'), icoBuffer);

console.log(`favicon.ico gerado com sucesso (${icoBuffer.length} bytes) — tamanhos: ${sizes.join(', ')}px`);
