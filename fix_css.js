const fs = require('fs');
const css = fs.readFileSync('app/globals.css', 'utf8');

const imports = [];
const otherLines = [];

const lines = css.split('\n');
for (const line of lines) {
  if (line.trim().startsWith('@import')) {
    imports.push(line);
  } else {
    otherLines.push(line);
  }
}

// Sort imports to put google fonts first, then tailwind, then others?
// Or just keep them?
// Google fonts first seems safe.
// Tailwind next.
// Local imports last.

const sortedImports = imports.sort((a, b) => {
  if (a.includes('googleapis')) return -1;
  if (b.includes('googleapis')) return 1;
  if (a.includes('tailwindcss')) return -1;
  if (b.includes('tailwindcss')) return 1;
  return 0;
});

const newCss = sortedImports.join('\n') + '\n\n' + otherLines.join('\n');
fs.writeFileSync('app/globals.css', newCss);
