const fs = require('fs');
const path = 'src/app/watch/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove forced dark mode
content = content.replace(
  '<div className="min-h-screen bg-background text-foreground flex flex-col dark">',
  '<div className="min-h-screen bg-background text-foreground flex flex-col">'
);

// 2. Main containers hardcoded colors -> semantic
content = content.replace(/bg-\[#1a1a1a\]/g, 'bg-card');
content = content.replace(/bg-\[#222\]/g, 'bg-muted/80');
content = content.replace(/bg-\[#1e1e1e\]/g, 'bg-muted/40');
content = content.replace(/bg-\[#111\]/g, 'bg-muted/20');
content = content.replace(/bg-\[#0f0f0f\]/g, 'bg-black/80'); // Video overlay should still be dark

// 3. Text colors
content = content.replace(/text-neutral-100/g, 'text-foreground');
content = content.replace(/text-neutral-200/g, 'text-foreground');
content = content.replace(/text-white/g, 'text-primary-foreground'); // Assuming white is mostly meant to be contrast against dark (or primary)

// Exceptions: we might have broken the "Play" icon or "Monica style header" icon which we specifically want to be white on a colored background
content = content.replace(/Sparkles className="w-3.5 h-3.5 text-primary-foreground"/g, 'Sparkles className="w-3.5 h-3.5 text-white"');
// The hover text in the Header 
content = content.replace(/hover:text-primary-foreground" onClick=\{\(\) => router.back\(\)\}/g, 'hover:text-foreground" onClick={() => router.back()}');
content = content.replace(/Play className="w-10 h-10 ml-2 fill-current"/g, 'Play className="w-10 h-10 ml-2 text-white fill-current"');

// 4. Tab active states
content = content.replace(
  /text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500\/5/g,
  'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-500/5'
);

// 5. Lightning / Deep mode switcher
content = content.replace(
  /text-yellow-500 border border-border/g,
  'text-yellow-600 dark:text-yellow-500 border border-border'
);
content = content.replace(
  /text-indigo-400 border border-border/g,
  'text-indigo-600 dark:text-indigo-400 border border-border'
);

// Let's also ensure text-foreground/80 is fine
// we previously replaced text-foreground0 with text-foreground/80 which is standard tailwind.

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed watch/[id]/page.tsx colors for light mode.');
