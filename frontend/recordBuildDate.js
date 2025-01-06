const fs = require('fs');

// Get the current build time
const buildTime = new Date().toISOString();

fs.writeFileSync('./src/buildInfo.json', JSON.stringify({ datetime: buildTime }));
console.log('Build info written to buildInfo.json:', buildTime);