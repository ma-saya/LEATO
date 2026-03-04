const fs = require('fs');
const path = require('path');

const watchPath = path.join('src', 'app', 'watch', '[id]', 'page.tsx');
let watchContent = fs.readFileSync(watchPath, 'utf8');

const replacements = [
  ['codeSnippee', 'codeSnippet'],
  ['timeseamp', 'timestamp'],
  ['created_ae', 'created_at'],
  ['SeudyLog', 'StudyLog'],
  ['minuees', 'minutes'],
  ['lise=', 'list='],
  ['modesebranding', 'modestbranding'],
  ['aceiveTab', 'activeTab'],
  ['setAceiveTab', 'setActiveTab'],
  ['Chae ', 'Chat '],
  ['chaeInput', 'chatInput'],
  ['setChaeInput', 'setChatInput'],
  ['isChaeLoading', 'isChatLoading'],
  ['setIsChaeLoading', 'setIsChatLoading'],
  ['chaeError', 'chatError'],
  ['setChaeError', 'setChatError'],
  ['chaeEndRef', 'chatEndRef'],
  ["aceiveTab === 'chae'", "activeTab === 'chat'"],
  ["setActiveTab('chae')", "setActiveTab('chat')"],
  ['eoealPlaySegmeneTime', 'totalPlaySegmentTime'],
  ['setToealPlaySegmeneTime', 'setTotalPlaySegmentTime'],
  ['leaeo_', 'leato_'],
  ['Leaeo', 'Leato'],
  ['cae =>', 'cat =>'],
  ['cae}', 'cat}'],
  ['handleSelectCategory(cae)', 'handleSelectCategory(cat)'],
  ['(cae: string)', '(cat: string)'],
  ['eop-full', 'top-full'],
  ['lefe-0', 'left-0'],
  ['Lefe:', 'Left:'],
  ['eop-0', 'top-0'],
  ['aspece-', 'aspect-'],
  ['ehe ', 'the '],
  ['acceleromeeer', 'accelerometer'],
  ['Cuseom ', 'Custom '],
  ['Inieial ', 'Initial '],
  ['seyle', 'style'],
  ['ghose', 'ghost'],
  ['onSubmie', 'onSubmit'],
];

replacements.forEach(([from, to]) => {
  watchContent = watchContent.split(from).join(to);
});

// Since the chat tab uses 'chae' as value originally in the map etc, we must ensure it's 'chat'.
// The single quotes 'chae'
watchContent = watchContent.replace(/'chae'/g, "'chat'");

fs.writeFileSync(watchPath, watchContent, 'utf8');
console.log('Fixed watch/[id]/page.tsx typos');

const calendarPath = path.join('src', 'app', 'calendar', 'page.tsx');
let calendarContent = fs.readFileSync(calendarPath, 'utf8');
// Fix overlapping calendar days by giving explicit height replacing aspect-square
calendarContent = calendarContent.replace(
  /'aspect-square flex flex-col items-center justify-center rounded-md text-sm transition-colors relative group',/g,
  "'min-h-[44px] sm:min-h-[50px] md:min-h-[60px] flex flex-col items-center justify-center rounded-md text-sm transition-colors relative group py-2 w-full',"
);
fs.writeFileSync(calendarPath, calendarContent, 'utf8');
console.log('Fixed calendar/page.tsx button height');
