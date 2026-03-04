const fs = require('fs');
const path = 'src/app/watch/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix the top right watermark icon inside Headline section
const headlineWatermarkRegex = /<div className="absolute top-0 right-0 p-4 opacity-5[^>]*>[\s\S]*?<\/div>/;
const newHeadlineWatermark = `<div className="absolute top-0 right-0 p-4 pointer-events-none text-muted-foreground" style={{ opacity: 0.04 }}>
                      {summaryMode === 'lightning' ? <Zap className="w-24 h-24" strokeWidth={1} /> : <Sparkles className="w-24 h-24" strokeWidth={1} />}
                    </div>`;
content = content.replace(headlineWatermarkRegex, newHeadlineWatermark);

// 2. Fix the takeaways section watermark icon
const takeawayWatermarkRegex = /<div className="absolute -right-4 -eop-4 text-purple-500\/10 pointer-events-none">[\s\S]*?<\/div>/;
const newTakeawayWatermark = `<div className="absolute -right-4 -top-4 pointer-events-none text-muted-foreground" style={{ opacity: 0.04 }}>
                      <Sparkles className="w-32 h-32" strokeWidth={1} />
                    </div>`;
content = content.replace(takeawayWatermarkRegex, newTakeawayWatermark);

// 3. Fix video title container border typo (border-e -> border-t)
content = content.replace(/<div className="p-4 border-e border-border">/, '<div className="p-4 border-t border-border">');

// 4. Additionally, ensure the background below the video is white by applying bg-card to the very outer wrap of Left Player if needed
// Actually, bg-card is already there. Let's just make sure there are no remaining bg-black anywhere affecting layout.
content = content.replace(/bg-black\/80/g, 'bg-black/70'); // Just the overlay

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed watermark opacities using inline styles and fixed remaining typos.');
