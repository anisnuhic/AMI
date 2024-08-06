const fs = require('fs');

function parsePjsipGlobals(filePath) {
  const data = fs.readFileSync(filePath, 'utf-8');
  const lines = data.split('\n');

  let globalsSection = false;
  const pjsipData = [];

  lines.forEach(line => {
    line = line.trim();

    if (line === '[globals]') {
      globalsSection = true;
      return;
    }

    if (line.startsWith('[') && globalsSection) {
      globalsSection = false;
      return;
    }

    if (globalsSection && line) {
      const match = line.match(/(\w+)=PJSIP\/(\w+)/);
      if (match) {
        const value = line.split('=')[1];
        pjsipData.push(value);
      }
    }
  });

  return pjsipData;
}

const filePath = '/etc/asterisk/extensions.conf';
const pjsipGlobals = parsePjsipGlobals(filePath);

console.log(pjsipGlobals);
