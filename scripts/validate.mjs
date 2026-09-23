import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('data.js', root), 'utf8'), context);

const places = context.window.YUANSHAN_PLACES || [];
const routes = context.window.YUANSHAN_ROUTES || [];
const allowedCats = new Set(['小吃','正餐','咖啡','自然','農場','親子','文化','酒廠']);
const ids = new Set();
const errors = [];

for (const p of places) {
  if (!p.id || !p.name || !p.cat || !p.address) errors.push(`地點欄位不完整: ${JSON.stringify(p)}`);
  if (ids.has(p.id)) errors.push(`重複 id: ${p.id}`);
  ids.add(p.id);
  if (!allowedCats.has(p.cat)) errors.push(`未知分類 ${p.cat}: ${p.name}`);
}
for (const route of routes) {
  for (const id of route.ids || []) if (!ids.has(id)) errors.push(`路線 ${route.name} 引用不存在 id: ${id}`);
}

const html = fs.readFileSync(new URL('index.html', root), 'utf8');
for (const id of ['map','placesGrid','locateBtn','nearbyBtn','familyBtn','rainBtn','freeBtn']) {
  if (!html.includes(`id="${id}"`)) errors.push(`index.html 缺少 #${id}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`PASS: ${places.length} 個地點 / ${routes.length} 條路線 / ${ids.size} 個唯一 ID`);
