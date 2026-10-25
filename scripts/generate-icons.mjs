import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="108" fill="#344f43"/><g fill="none" stroke="#f9efcf" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"><path d="M135 164v183h244M162 167v157m46-170v170m48-157v157m38-161 35 153M123 363h258"/><path d="M150 194h24m22 91h25m23-89h24m35 39 21-5"/></g><circle cx="371" cy="145" r="24" fill="#cb865c"/></svg>`;
await mkdir('public/icons', { recursive: true });
for (const [name, size] of [
  ['icon-192', 192],
  ['icon-512', 512],
  ['maskable-512', 512],
  ['apple-touch-icon', 180],
])
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/${name}.png`);
console.log('Generated four original PWA PNG icons.');
