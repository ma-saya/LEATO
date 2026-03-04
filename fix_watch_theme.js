const fs = require('fs');
const watchPath = 'src/app/watch/[id]/page.tsx';
let content = fs.readFileSync(watchPath, 'utf8');

content = content.replace(
  '<div className="min-h-screen bg-background text-foreground flex flex-col">',
  '<div className="min-h-screen bg-background text-foreground flex flex-col dark">'
);

content = content.replace(/text-foreground0/g, 'text-foreground/80');

fs.writeFileSync(watchPath, content, 'utf8');
console.log('Fixed watch page theme forcing and typos.');
