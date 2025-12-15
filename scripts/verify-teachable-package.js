const fs = require('fs');
const path = require('path');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const modulePath = path.join(process.cwd(), 'node_modules', '@api', 'teachable', 'index.js');
if (!fs.existsSync(modulePath)) {
  fail('Missing @api/teachable runtime entry at node_modules/@api/teachable/index.js');
}

process.exit(0);
