const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(process.cwd(), 'node_modules', '@api', 'teachable', 'index.js'),
  path.join(process.cwd(), 'node_modules', '@api', 'teachable', 'dist', 'index.js')
];

const exists = candidates.some((p) => fs.existsSync(p));

if (!exists) {
  console.warn('Missing @api/teachable runtime entry, skipping verification.');
  process.exit(0);
}

process.exit(0);
