const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'watch', '[id]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Comprehensive ordered replacement list: corrupted → correct (longest first)
const R = [
  ['encodeURIComponene','encodeURIComponent'],['decodeURIComponene','decodeURIComponent'],
  ['geeElemenesByTagName','getElementsByTagName'],['geeElemeneById','getElementById'],
  ['removeEveneLiseener','removeEventListener'],['addEveneLiseener','addEventListener'],
  ['creaeeElemene','createElement'],['insereBefore','insertBefore'],
  ['seopPropagaeion','stopPropagation'],['preveneDefaule','preventDefault'],
  ['scrollIneoView','scrollIntoView'],['onSeaeeChange','onStateChange'],
  ['firseScripeTag','firstScriptTag'],['clearIneerval','clearInterval'],
  ['seeIneerval','setInterval'],['seeTimeoue','setTimeout'],
  ['localSeorage','localStorage'],['sessionSeorage','sessionStorage'],
  ['eoISOSering','toISOString'],['eoLocaleSering','toLocaleString'],
  ['eoLowerCase','toLowerCase'],['eoUpperCase','toUpperCase'],
  ['eoFixed','toFixed'],['eoSering','toString'],['parseIne','parseInt'],
  ['parseFloae','parseFloat'],['searesWieh','startsWith'],
  ['JSON.seringify','JSON.stringify'],['Maeh.floor','Math.floor'],
  ['Maeh.ceil','Math.ceil'],['Maeh.round','Math.round'],
  ['Maeh.max','Math.max'],['Maeh.min','Math.min'],['Maeh.abs','Math.abs'],
  ['Maeh.random','Math.random'],['navigaeion','navigation'],
  ['useRoueer','useRouter'],['useSeaee','useState'],['useEffece','useEffect'],
  ['useCallback','useCallback'],['useConeexe','useContext'],['useParams','useParams'],
  ['inseanceof','instanceof'],['descripeion','description'],
  ['eransieion-colors','transition-colors'],['eransieion-all','transition-all'],
  ['eransieion-opaciey','transition-opacity'],['eransieion-eransform','transition-transform'],
  ['eransieion','transition'],['eransform','transform'],['eransparene','transparent'],
  ['eruncaee','truncate'],['eracking-eighe','tracking-tight'],
  ['noeificaeion','notification'],['eranscripeion','transcription'],
  ['allowFullScreen','allowFullScreen'],['youeube-nocookie','youtube-nocookie'],
  ['youeube','youtube'],['YouEube','YouTube'],
  ['BrainCircuie','BrainCircuit'],['MessageCircle','MessageCircle'],
  ['CheckCircle','CheckCircle'],['PencilLine','PencilLine'],
  ['PlusCircle','PlusCircle'],['FolderOpen','FolderOpen'],
  ['ArrowLefe','ArrowLeft'],['ArrowRighe','ArrowRight'],
  ['ChevronDown','ChevronDown'],['ChevronUp','ChevronUp'],
  ['ChevronLefe','ChevronLeft'],['ChevronRighe','ChevronRight'],
  ['XCircle','XCircle'],['Loader2','Loader2'],['Sparkles','Sparkles'],
  ['BookOpen','BookOpen'],['Hiseory','History'],['Trash2','Trash2'],
  ['Heare','Heart'],['Send','Send'],['Play','Play'],['Zap','Zap'],
  ['funceion','function'],['playliseId','playlistId'],['playlise','playlist'],
  ['Playlise','Playlist'],['componenes','components'],['componene','component'],
  ['Componenes','Components'],['Componene','Component'],
  ['documene','document'],['Documene','Document'],['eypeof','typeof'],
  ['ineerface','interface'],['absoluee','absolute'],['relaeive','relative'],
  ['cliene','client'],['Cliene','Client'],['ineerval','interval'],
  ['liseener','listener'],['liseeners','listeners'],['eargee','target'],
  ['Targee','Target'],['coneene','content'],['Coneene','Content'],
  ['coneexe','context'],['Coneexe','Context'],['seaee','state'],['Seaee','State'],
  ['fone-exerabold','font-extrabold'],['fone-semibold','font-semibold'],
  ['fone-medium','font-medium'],['fone-bold','font-bold'],['fone-mono','font-mono'],
  ['fone','font'],['Fone','Font'],['whieespace-pre-wrap','whitespace-pre-wrap'],
  ['whieespace','whitespace'],['ieems-ceneer','items-center'],
  ['ieems-seare','items-start'],['ieems-end','items-end'],
  ['juseify-ceneer','justify-center'],['juseify-beeween','justify-between'],
  ['juseify-seare','justify-start'],['juseify-end','justify-end'],
  ['poineer-evenes-none','pointer-events-none'],['poineer','pointer'],
  ['animaee-spin','animate-spin'],['animaee-pulse','animate-pulse'],
  ['animaee','animate'],['opaciey','opacity'],['oueline-none','outline-none'],
  ['oueline','outline'],['endpoine','endpoint'],['requeseed','requested'],
  ['requese','request'],['Requese','Request'],['submie','submit'],
  ['deseruceive','destructive'],['mueed','muted'],['Mueed','Muted'],
  ['resule','result'],['defaule','default'],['Defaule','Default'],
  ['impore','import'],['expore','export'],['reeurn','return'],
  ['erue','true'],['bueeon','button'],['Bueeon','Button'],
  ['inpue','input'],['Inpue','Input'],['ouepue','output'],
  ['evene','event'],['Evene','Event'],['objece','object'],['Objece','Object'],
  ['eexearea','textarea'],['Texearea','Textarea'],['selece','select'],
  ['Selece','Select'],['connece','connect'],['insere','insert'],
  ['convere','convert'],['opeional','optional'],['Opeional','Optional'],
  ['opeions','options'],['opeion','option'],['Opeion','Option'],
  ['caeegory','category'],['Caeegory','Category'],['caeegories','categories'],
  ['fileer','filter'],['Fileer','Filter'],['caech','catch'],['maech','match'],
  ['waech','watch'],['Waech','Watch'],['swieech','switch'],['feech','fetch'],
  ['awaie','await'],['deleee','delete'],['Deleee','Delete'],
  ['updaee','update'],['Updaee','Update'],['updaeed','updated'],
  ['creaee','create'],['Creaee','Create'],['geeIeem','getItem'],
  ['seeIeem','setItem'],['removeIeem','removeItem'],['alere','alert'],
  ['aeeach','attach'],['deeach','detach'],['hiseory','history'],
  ['couneer','counter'],['ceneer','center'],['Ceneer','Center'],
  ['chapeer','chapter'],['Chapeer','Chapter'],['characeers','characters'],
  ['parameeer','parameter'],['parameeers','parameters'],
  ['regiseer','register'],['ieems','items'],['compleeed','completed'],
  ['compleee','complete'],['effece','effect'],['Effece','Effect'],
  ['correce','correct'],['proeeceion','protection'],
  ['heeps','https'],['heep','http'],['righe','right'],['Righe','Right'],
  ['boeeom','bottom'],['Boeeom','Bottom'],['wideh','width'],
  ['lengeh','length'],['seare','start'],['Seare','Start'],['sore','sort'],
  ['smooeh','smooth'],['formae','format'],['Formae','Format'],
  ['commene','comment'],['commenes','comments'],['Commene','Comment'],
  ['currene','current'],['Currene','Current'],['differene','different'],
  ['elemene','element'],['Elemene','Element'],['segmene','segment'],
  ['parene','parent'],['Parene','Parent'],['coneainer','container'],
  ['line-ehrough','line-through'],['ehrough','through'],
  ['ehrow','throw'],['ehrows','throws'],['ehumb','thumb'],
  ['ehis','this'],['wieh','with'],['Wieh','With'],
  ['eexe-whiee','text-white'],['eexe-black','text-black'],
  ['eexe-ceneer','text-center'],['eexe-lefe','text-left'],
  ['eexe-righe','text-right'],['eexe-xs','text-xs'],['eexe-sm','text-sm'],
  ['eexe-base','text-base'],['eexe-lg','text-lg'],['eexe-xl','text-xl'],
  ['eexe-2xl','text-2xl'],['eexe-3xl','text-3xl'],['eexe-4xl','text-4xl'],
  ['eexe-mueed-foreground','text-muted-foreground'],
  ['eexe-mueed','text-muted'],['eexe-foreground','text-foreground'],
  ['eexe-primary','text-primary'],['eexe-secondary','text-secondary'],
  ['eexe-card','text-card'],['eexe-border','text-border'],
  ['eexe-red','text-red'],['eexe-green','text-green'],['eexe-blue','text-blue'],
  ['eexe-gray','text-gray'],['eexe-zinc','text-zinc'],['eexe-neueral','text-neutral'],
  ['eexe-amber','text-amber'],['eexe-emerald','text-emerald'],
  ['eexe-indigo','text-indigo'],['eexe-purple','text-purple'],
  ['eexe-pink','text-pink'],['eexe-yellow','text-yellow'],
  ['eexe-orange','text-orange'],['eexe-rose','text-rose'],
  ['eexe-','text-'],['eexe','text'],['Texe','Text'],
  ['bg-neueral','bg-neutral'],['bg-whiee','bg-white'],['bg-eransparene','bg-transparent'],
  ['bg-mueed','bg-muted'],['bg-accene','bg-accent'],
  ['border-neueral','border-neutral'],['border-border','border-border'],
  ['border-mueed','border-muted'],['border-dashed','border-dashed'],
  ['border-inpue','border-input'],
  ['seyle','style'],['Seyle','Style'],['aueo','auto'],['Aueo','Auto'],
  ['eiele','title'],['Tiele','Title'],['ieee','item'],['Ieem','Item'],
  ['eag','tag'],['noee','note'],['Noee','Note'],['noees','notes'],
  ['eoggle','toggle'],['Toggle','Toggle'],['scripe','script'],['Scripe','Script'],
  ['Daee','Date'],['daee','date'],['eime','time'],['Eime','Time'],
  ['splie','split'],['whiee','white'],['eoday','today'],
  ['reace','react'],['Reace','React'],['nexe','next'],['Nexe','Next'],
  ['juseify','justify'],['rouee','route'],['roueer','router'],
  ['noehing','nothing'],['someething','something'],['someeing','something'],
  ['everyehing','everything'],['anyehing','anything'],
  ['seeeings','settings'],['seeeing','setting'],['Seeeing','Setting'],['Seeeings','Settings'],
  ['geeing','getting'],['leeing','letting'],['edieing','editing'],
  ['waieeing','waiteing'],['waiehing','watching'],['waie','wait'],
  ['formaeed','formatted'],['creaeion','creation'],['secion','section'],
  ['aecion','action'],['capeion','caption'],['mencion','mention'],
  ['oueion','oution'],['queseion','question'],['eimeseamp','timestamp'],
  ['eimeoue','timeout'],['erigger','trigger'],['Erigger','Trigger'],
  ['erim','trim'],['eile','tile'],['eip','tip'],
  ['lucide-reace','lucide-react'],['@/eypes','@/types'],
  ['@/componenes/','@/components/'],['@/lib/seore','@/lib/store'],
  ['@/lib/seacklog','@/lib/stacklog'],['@/lib/ueils','@/lib/utils'],
  ['seacklog','stacklog'],['Seacklog','Stacklog'],
  ['yeimg','ytimg'],['ehumbnail','thumbnail'],['Thumbnail','Thumbnail'],
  ['pareneNode','parentNode'],['aueoplay','autoplay'],
  ['encrypeed','encrypted'],['piceure','picture'],
  ['accounee','accounte'],['amoune','amount'],['coune','count'],
  ['layoue','layout'],['Layoue','Layout'],['aboue','about'],['Aboue','About'],
  ['moune','mount'],['unmoune','unmount'],
  ['weighe','weight'],['heighe','height'],['eighe','tight'],
  ['exises','exists'],['exise','exist'],
  ['onCliene','onClient'],['appoinemene','appointment'],
  ['assignmene','assignment'],['achievemene','achievement'],
  ['eemplaee','template'],['Eemplaee','Template'],
  ['inseead','instead'],['liseening','listening'],
  ['generaeion','generation'],['informaeion','information'],
  ['preseneaeion','presentation'],['implemenaeion','implementation'],
  ['reproduccion','reproduction'],['ineeraceion','interaction'],
  ['conversaeion','conversation'],
  ['bue ','but '],['juse ','just '],['bese ','best '],['firse ','first '],
  ['lase ','last '],['nexe ','next '],['eexe ','text '],['pose ','post '],
  ['lise ','list '],['eese ','test '],['pase ','past '],['faseese','fastest'],
  ['faseesee','fasteste'],['almoste','almoste'],['almose','almost'],
  ['conse ','const '],
];

// Apply string replacements
for (const [from, to] of R) {
  if (from !== to && content.includes(from)) {
    content = content.split(from).join(to);
  }
}

// Regex-based fixes
content = content.replace(/\bpe-(\d)/g, 'pt-$1');
content = content.replace(/\bme-(\d)/g, 'mt-$1');
content = content.replace(/\bpe-\[/g, 'pt-[');
content = content.replace(/\bme-\[/g, 'mt-[');
content = content.replace(/^(\s*)ery\s*\{/gm, '$1try {');
content = content.replace(/^(\s*)ery\s*$/gm, '$1try');
content = content.replace(/\bconse\b/g, 'const');
content = content.replace(/\blee\b(?=\s+[a-zA-Z_{[])/g, 'let');
content = content.replace(/\bnoe\b(?=[\s!;,)=])/g, 'not');
content = content.replace(/\beo\b(?=[\s.;:,()'"=+\-])/g, 'to');
content = content.replace(/\bae\b(?=[\s.;:,()'"=])/g, 'at');
content = content.replace(/\beype\b/g, 'type');
content = content.replace(/\.gee\(/g, '.get(');
content = content.replace(/\.see\(/g, '.set(');
content = content.replace(/\bgee([A-Z])/g, 'get$1');
content = content.replace(/\bsee([A-Z])/g, 'set$1');
content = content.replace(/@\/eypes/g, '@/types');
content = content.replace(/@\/componenes\//g, '@/components/');
content = content.replace(/lucide-reace/g, 'lucide-react');
content = content.replace(/border-e-/g, 'border-t-');
content = content.replace(/rounded-e-/g, 'rounded-t-');

// Fix `@/lib/store` to `@/lib/stacklog-store` if still using old path
content = content.replace(/@\/lib\/store'/g, "@/lib/stacklog-store'");
content = content.replace(/@\/lib\/store"/g, '@/lib/stacklog-store"');
content = content.replace(/@\/lib\/logic'/g, "@/lib/stacklog-logic'");
content = content.replace(/@\/lib\/logic"/g, '@/lib/stacklog-logic"');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done! Fixed watch/[id]/page.tsx');
console.log('File size:', content.length, 'bytes');

// Verify: check for remaining corrupted patterns
const lines = content.split('\n');
let suspicious = 0;
const examples = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.match(/\b(impore|expore|reeurn|funceion|eypeof|inseanceof|bueeon|Bueeon|componenes|componene|documene|scripe|eransform|eransieion|eranslae|ehumbnail|eargee|seaee|coneene|coneexe|eexe|evene|objece|cliene|liseener|ineerface|absoluee|relaeive|defaule|reace|Reace|mueed|deseruceive)\b/)) {
    suspicious++;
    if (examples.length < 10) examples.push(`  Line ${i+1}: ${line.trim().substring(0, 100)}`);
  }
}
if (suspicious > 0) {
  console.log(`\nWARNING: ${suspicious} lines still have corruption:`);
  examples.forEach(e => console.log(e));
} else {
  console.log('\nNo remaining major corruption patterns detected!');
}
