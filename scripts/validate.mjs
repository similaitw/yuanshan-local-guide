import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('data.js',root),'utf8'),context);
const places=context.window.YUANSHAN_PLACES||[],routes=context.window.YUANSHAN_ROUTES||[],ids=new Set(),errors=[];
for(const p of places){
  if(!p.id||!p.name||!p.cat||!p.address)errors.push(`地點欄位不完整: ${p?.name||p?.id}`);
  if(ids.has(p.id))errors.push(`重複 id: ${p.id}`);
  ids.add(p.id);
}
for(const r of routes)for(const id of r.ids||[])if(!ids.has(id))errors.push(`路線 ${r.name} 引用不存在 id: ${id}`);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
for(const id of ['mapFrame','mapPlaceSelect','placesGrid','locateBtn','nearbyBtn','tripSelect','routeStops','openRouteBtn'])if(!html.includes(`id="${id}"`))errors.push(`index.html 缺少 #${id}`);
const app=fs.readFileSync(new URL('app.js',root),'utf8');
if(!app.includes('maps.google.com/maps?q='))errors.push('缺少免 API Key Google Maps iframe');
if(!app.includes('google.com/maps/dir/?'))errors.push('缺少 Google Maps 多站路線 URL');
if(app.includes('maps.googleapis.com/maps/api/js'))errors.push('仍殘留 Maps JavaScript API');
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`PASS: ${places.length} 個地點 / ${routes.length} 條建議行程 / Google Maps iframe / 免 API Key / 自訂路線`);
