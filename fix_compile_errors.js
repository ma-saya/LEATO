const fs = require('fs');

// 1. Fix log/new/page.tsx
const logPath = 'src/app/log/new/page.tsx';
let logContent = fs.readFileSync(logPath, 'utf8');
logContent = logContent.replace(/isLoading={isLoading}/g, 'disabled={isLoading}');
logContent = logContent.replace(
  /const \[categoryColors, setCategoryColors\] = useState<Record<string, string>>\([^)]*\);/g,
  'const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});'
);
// Make sure getSettings is no longer synchronously called
logContent = logContent.replace(/getSettings\(\)\.categories/g, '(settings?.categories || [])');
logContent = logContent.replace(
  /const \[settings, setSettings\] = useState<Settings>\(getSettings\(\)\);/g,
  'const [settings, setSettings] = useState<Settings>({ dailyGoal: 120, weeklyGoal: 840, categories: [\'React\', \'Next.js\', \'TypeScript\', \'TailwindCSS\', \'英語\', \'読書\', \'その他\'], categoryColors: {} });\n  useEffect(() => { getSettings().then(s => { setSettings(s); setCategoryColors(s.categoryColors || {}); }); }, []);'
);
fs.writeFileSync(logPath, logContent, 'utf8');
console.log('Fixed log/new/page.tsx');

// 2. Fix tasks/page.tsx
const tasksPath = 'src/app/tasks/page.tsx';
let tasksContent = fs.readFileSync(tasksPath, 'utf8');
tasksContent = tasksContent.replace(/, initStorage/, '');
tasksContent = tasksContent.replace(
  /const \[todos, setTodos\] = useState<Todo\[\]>\(\(\) => getTodos\(\)\);/,
  'const [todos, setTodos] = useState<Todo[]>([]);\n  useEffect(() => { getTodos().then(setTodos); }, []);'
);
tasksContent = tasksContent.replace(
  /const \[settings, setSettings\] = useState<Settings>\(getSettings\(\)\);/g,
  'const [settings, setSettings] = useState<Settings>({ dailyGoal: 120, weeklyGoal: 840, categories: [\'React\', \'Next.js\', \'TypeScript\', \'TailwindCSS\', \'英語\', \'読書\', \'その他\'], categoryColors: {} });\n  useEffect(() => { getSettings().then(setSettings); }, []);'
);
tasksContent = tasksContent.replace(/getSettings\(\)\.categories/g, '(settings?.categories || [])');
tasksContent = tasksContent.replace(/variant="primary"/g, 'variant="default"');
tasksContent = tasksContent.replace(/variant="danger"/g, 'variant="destructive"');
fs.writeFileSync(tasksPath, tasksContent, 'utf8');
console.log('Fixed tasks/page.tsx');

// 3. Fix watch/[id]/page.tsx
const watchPath = 'src/app/watch/[id]/page.tsx';
let watchContent = fs.readFileSync(watchPath, 'utf8');
watchContent = watchContent.replace(/NodeJS\.Timeoue/g, 'NodeJS.Timeout');
watchContent = watchContent.replace(/\bsavedAe\b/g, 'savedAt');
watchContent = watchContent.replace(/\bmeehod\b/g, 'method');
watchContent = watchContent.replace(/\.ehen\(/g, '.then(');
watchContent = watchContent.replace(/subser\(/g, 'substring(');
watchContent = watchContent.replace(/variane=/g, 'variant=');
watchContent = watchContent.replace(/onSubmie=/g, 'onSubmit=');
fs.writeFileSync(watchPath, watchContent, 'utf8');
console.log('Fixed watch/[id]/page.tsx');
