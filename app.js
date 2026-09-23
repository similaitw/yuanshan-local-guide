const places = window.YUANSHAN_PLACES;
const routes = window.YUANSHAN_ROUTES;
const $ = (sel) => document.querySelector(sel);
const els = {
  chips: $('#chips'), grid: $('#placesGrid'), resultCount: $('#resultCount'), placeCount: $('#placeCount'),
  search: $('#searchInput'), clear: $('#clearSearch'), loadMore: $('#loadMoreBtn'), nearby: $('#nearbyBtn'),
  locate: $('#locateBtn'), refreshLocation: $('#refreshLocation'), nearbyContent: $('#nearbyContent'), mapStatus: $('#mapStatus'),
  routeGrid: $('#routeGrid'), toast: $('#toast'), openNow: $('#openNowBtn'), family: $('#familyBtn'), rain: $('#rainBtn'), free: $('#freeBtn'), allBtn: $('#allBtn'), reset: $('#resetBtn'), theme: $('#themeBtn'), share: $('#shareBtn')
};

let activeCategory = '全部';
let query = '';
let userPos = null;
let showCount = 12;
let nearestMode = false;
let openMode = false;
let familyMode = false;
let rainMode = false;
let freeMode = false;
let osmPois = [];
let coordById = new Map();
let markerById = new Map();
let userMarker = null;
let map;
let markerLayer;
let toastTimer;
const geocodeQueue = new Map();

const categories = [
  ['全部','全部'],['小吃','🍜 小吃'],['正餐','🍗 正餐'],['咖啡','☕ 咖啡甜點'],['自然','🌿 自然'],['農場','🚜 農場'],['親子','👨‍👩‍👧 親子'],['文化','🏯 文化'],['酒廠','🥃 酒廠']
];

function normalize(s='') {
  return s.toLowerCase().replace(/[\s·・｜|()（）\-—_]/g,'').replace(/宜蘭|員山鄉|員山/g,'');
}
function distanceKm(a,b){
  const R=6371,toRad=d=>d*Math.PI/180;
  const dLat=toRad(b.lat-a.lat),dLon=toRad(b.lng-a.lng);
  const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function googleNav(place){
  const dest = encodeURIComponent(`${place.name} ${place.address}`);
  const origin = userPos ? `&origin=${userPos.lat},${userPos.lng}` : '';
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving${origin}`;
}
function showToast(msg){
  clearTimeout(toastTimer); els.toast.textContent=msg; els.toast.classList.add('show');
  toastTimer=setTimeout(()=>els.toast.classList.remove('show'),2600);
}
function buildChips(){
  els.chips.innerHTML=categories.map(([key,label])=>`<button class="chip ${key==='全部'?'active':''}" data-cat="${key}" type="button">${label}</button>`).join('');
  els.chips.addEventListener('click',e=>{
    const b=e.target.closest('[data-cat]'); if(!b)return;
    activeCategory=b.dataset.cat; showCount=12; nearestMode=false;
    document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x===b));
    els.nearby.classList.remove('active'); renderPlaces();
  });
}
function passesToday(place){
  if(!openMode) return true;
  const h=place.hours||'';
  const day=new Date().getDay();
  if(/週二常休/.test(h)&&day===2) return false;
  if(/週三常休/.test(h)&&day===3) return false;
  if(/週三四常休/.test(h)&&(day===3||day===4)) return false;
  if(/五六日/.test(h)&&![5,6,0].includes(day)) return false;
  if(/多為週三至週日/.test(h)&&[1,2].includes(day)) return false;
  if(/多為週末/.test(h)&&![6,0].includes(day)) return false;
  return true;
}
function passesSmartFilters(place){
  const tags = place.tags || [];
  if(familyMode && !(place.cat==='親子' || place.cat==='農場' || tags.some(t=>/親子|動物|DIY|公園/.test(t)))) return false;
  if(rainMode && !tags.some(t=>/室內|觀光工廠|博物館/.test(t)) && place.cat!=='酒廠') return false;
  if(freeMode && !tags.some(t=>/免費/.test(t))) return false;
  return true;
}
function getFiltered(){
  const q=normalize(query);
  let list=places.filter(p=>(activeCategory==='全部'||p.cat===activeCategory)&&passesToday(p)&&passesSmartFilters(p));
  if(q) list=list.filter(p=>normalize([p.name,p.address,p.desc,p.cat,...p.tags].join(' ')).includes(q));
  if(nearestMode&&userPos){
    list=list.map(p=>({...p,_d:coordById.has(p.id)?distanceKm(userPos,coordById.get(p.id)):Infinity})).sort((a,b)=>a._d-b._d);
  }
  return list;
}
function cardHtml(p){
  const c=coordById.get(p.id); const d=userPos&&c?distanceKm(userPos,c):null;
  const dist=d!=null?`${d<1?(d*1000).toFixed(0)+' m':d.toFixed(1)+' km'}`:'距離待定位';
  return `<article class="place-card" data-id="${p.id}">
    <div class="place-top"><span class="place-emoji">${p.emoji}</span><span class="place-distance">${dist}</span></div>
    <h3>${p.name}</h3>
    <div class="place-meta"><span class="tag">${p.cat}</span>${p.tags.slice(0,2).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
    <p class="place-desc">${p.desc}</p>
    <div class="place-address">${p.address}<br>◷ ${p.hours}</div>
    <div class="place-actions"><button class="map-focus" data-focus="${p.id}" type="button">地圖定位</button><a class="nav-link" href="${googleNav(p)}" target="_blank" rel="noopener">導航 ↗</a></div>
  </article>`;
}
function renderPlaces(){
  const list=getFiltered();
  const visible=list.slice(0,showCount);
  els.grid.innerHTML=visible.map(cardHtml).join('') || `<div class="empty-state"><div><span>⌕</span><p>找不到符合的地點，換個關鍵字看看。</p></div></div>`;
  els.resultCount.textContent=`顯示 ${list.length} 個地點${nearestMode&&userPos?' · 依距離排序':''}`;
  els.loadMore.classList.toggle('hidden',showCount>=list.length);
  els.placeCount.textContent=places.length;
}
function buildRoutes(){
  els.routeGrid.innerHTML=routes.map((r,i)=>`<article class="route-card"><div><div class="route-icon">${r.icon}</div><h3>${r.name}</h3><p>${r.desc}</p></div><button data-route="${i}" type="button">開啟路線 ↗</button></article>`).join('');
}
function openRoute(idx){
  const r=routes[idx]; const ps=r.ids.map(id=>places.find(p=>p.id===id)).filter(Boolean); if(ps.length<2)return;
  const origin=userPos?`${userPos.lat},${userPos.lng}`:`${ps[0].name} ${ps[0].address}`;
  const destination=`${ps.at(-1).name} ${ps.at(-1).address}`;
  const mids=(userPos?ps.slice(0,-1):ps.slice(1,-1)).map(p=>`${p.name} ${p.address}`);
  const url=`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${mids.length?`&waypoints=${encodeURIComponent(mids.join('|'))}`:''}&travelmode=driving`;
  window.open(url,'_blank','noopener');
}

function initMap(){
  map=L.map('map',{zoomControl:true}).setView([24.744,121.687],11.5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  markerLayer=L.layerGroup().addTo(map);
}
function markerIcon(emoji, accent=false){
  return L.divIcon({className:'',html:`<div style="width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:${accent?'#d8ff53':'#11110f'};color:#fff;border:2px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.2);font-size:16px">${emoji}</div>`,iconSize:[34,34],iconAnchor:[17,17],popupAnchor:[0,-16]});
}
function addPlaceMarker(place, coord){
  if(markerById.has(place.id)) return;
  const m=L.marker([coord.lat,coord.lng],{icon:markerIcon(place.emoji)}).addTo(markerLayer);
  m.bindPopup(`<div class="popup-title">${place.emoji} ${place.name}</div><div class="popup-sub">${place.address}</div><a class="popup-link" target="_blank" rel="noopener" href="${googleNav(place)}">Google Maps 導航 ↗</a>`);
  markerById.set(place.id,m);
}
function matchOsmToCurated(){
  let matched=0;
  for(const p of places){
    if(coordById.has(p.id)) continue;
    const n=normalize(p.name); let best=null,bestScore=0;
    for(const poi of osmPois){
      const pn=normalize(poi.name||''); if(!pn) continue;
      let score=0;
      if(pn===n) score=100; else if(pn.includes(n)||n.includes(pn)) score=Math.min(pn.length,n.length);
      else {
        const key=p.tags.find(t=>pn.includes(normalize(t))); if(key) score=2;
      }
      if(score>bestScore){bestScore=score;best=poi;}
    }
    if(best&&bestScore>=3){coordById.set(p.id,{lat:best.lat,lng:best.lng});addPlaceMarker(p,{lat:best.lat,lng:best.lng});matched++;}
  }
  return matched;
}
async function loadOsmPois(){
  const areaQuery=`[out:json][timeout:28];area["name"="員山鄉"]["boundary"="administrative"]->.a;(nwr["amenity"](area.a);nwr["tourism"](area.a);nwr["leisure"](area.a);nwr["shop"](area.a);nwr["craft"](area.a););out center tags;`;
  const bboxQuery=`[out:json][timeout:28];(nwr["amenity"](24.64,121.59,24.84,121.80);nwr["tourism"](24.64,121.59,24.84,121.80);nwr["leisure"](24.64,121.59,24.84,121.80););out center tags;`;
  for(const q of [areaQuery,bboxQuery]){
    try{
      const res=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(q)});
      if(!res.ok) throw new Error('overpass');
      const json=await res.json();
      const parsed=json.elements.map(el=>({name:el.tags?.name||el.tags?.['name:zh']||'',lat:el.lat??el.center?.lat,lng:el.lon??el.center?.lon,tags:el.tags||{}})).filter(x=>x.lat&&x.lng&&x.name);
      if(parsed.length){osmPois=parsed;const matched=matchOsmToCurated();els.mapStatus.textContent=`已載入地圖資料 · 對應 ${matched} 個精選地點`;renderPlaces();return;}
    }catch(e){}
  }
  els.mapStatus.textContent='地圖可使用；部分精選地點會在點選時即時定位';
}
async function geocodePlace(place){
  if(coordById.has(place.id))return coordById.get(place.id);
  if(geocodeQueue.has(place.id))return geocodeQueue.get(place.id);
  const promise=(async()=>{
    const cacheKey='geo:'+place.id; const cached=localStorage.getItem(cacheKey);
    if(cached){try{const c=JSON.parse(cached);coordById.set(place.id,c);addPlaceMarker(place,c);return c;}catch{}}
    try{
      const q=encodeURIComponent(`${place.name}, ${place.address}, 台灣`);
      const res=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=tw&q=${q}`,{headers:{'Accept-Language':'zh-TW,zh;q=0.9'}});
      const json=await res.json();
      if(json[0]){const c={lat:+json[0].lat,lng:+json[0].lon};coordById.set(place.id,c);localStorage.setItem(cacheKey,JSON.stringify(c));addPlaceMarker(place,c);return c;}
    }catch(e){}
    return null;
  })();
  geocodeQueue.set(place.id,promise); const out=await promise; geocodeQueue.delete(place.id); return out;
}
async function focusPlace(id){
  const p=places.find(x=>x.id===id); if(!p)return;
  showToast(`正在定位「${p.name}」…`);
  const c=await geocodePlace(p);
  if(c){map.flyTo([c.lat,c.lng],15,{duration:.8});markerById.get(p.id)?.openPopup();document.querySelector(`.place-card[data-id="${id}"]`)?.classList.add('highlight');setTimeout(()=>document.querySelector(`.place-card[data-id="${id}"]`)?.classList.remove('highlight'),1800);}
  else{showToast('地圖暫時無法定位，仍可直接使用 Google Maps 導航');}
}

async function requestLocation(){
  if(!navigator.geolocation){showToast('這個瀏覽器不支援定位');return;}
  els.locate.disabled=true; els.locate.textContent='定位中…';
  navigator.geolocation.getCurrentPosition(async pos=>{
    userPos={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy};
    if(userMarker)userMarker.remove();
    userMarker=L.marker([userPos.lat,userPos.lng],{icon:markerIcon('●',true),zIndexOffset:1000}).addTo(map).bindPopup('<b>你目前的位置</b>');
    map.flyTo([userPos.lat,userPos.lng],12.5,{duration:.8});
    els.locate.textContent='✓ 已取得位置'; els.locate.disabled=false; nearestMode=true; els.nearby.classList.add('active');
    renderPlaces(); renderNearby();
    showToast('已依你的目前位置計算距離');
    resolveNearestUnmatched();
  },err=>{
    els.locate.disabled=false; els.locate.textContent='◎ 使用我的位置';
    const msg=err.code===1?'你尚未允許瀏覽器定位；可在瀏覽器網站權限中開啟。':'目前無法取得位置，請稍後再試。'; showToast(msg);
  },{enableHighAccuracy:true,timeout:12000,maximumAge:120000});
}
function renderNearby(){
  if(!userPos)return;
  const curated=places.filter(p=>coordById.has(p.id)).map(p=>({...p,d:distanceKm(userPos,coordById.get(p.id))})).sort((a,b)=>a.d-b.d).slice(0,8);
  if(!curated.length){els.nearbyContent.className='empty-state';els.nearbyContent.innerHTML='<span>⌁</span><p>正在解析精選地點座標，稍等一下就會出現最近的去處。</p>';return;}
  els.nearbyContent.className='near-list';
  els.nearbyContent.innerHTML=curated.map((p,i)=>`<div class="near-item"><span class="near-rank">${i+1}</span><div><b>${p.name}</b><small>${p.d<1?(p.d*1000).toFixed(0)+' 公尺':p.d.toFixed(1)+' 公里'} · ${p.cat}</small></div><button data-near="${p.id}" type="button">地圖</button></div>`).join('');
}
async function resolveNearestUnmatched(){
  const unmatched=places.filter(p=>!coordById.has(p.id));
  if(unmatched.length) els.mapStatus.textContent=`正在補齊 ${unmatched.length} 個地點座標…`;
  let done=0;
  for(const p of unmatched){
    await geocodePlace(p); done++; renderNearby(); if(nearestMode)renderPlaces();
    if(done%5===0 || done===unmatched.length) els.mapStatus.textContent=`附近排序資料更新中 · ${done}/${unmatched.length}`;
    await new Promise(r=>setTimeout(r,1050));
  }
  els.mapStatus.textContent='附近排序資料已更新';
}

els.search.addEventListener('input',e=>{query=e.target.value.trim();showCount=12;renderPlaces();});
els.clear.addEventListener('click',()=>{els.search.value='';query='';renderPlaces();els.search.focus();});
els.loadMore.addEventListener('click',()=>{showCount+=12;renderPlaces();});
els.locate.addEventListener('click',requestLocation);
els.refreshLocation.addEventListener('click',requestLocation);
els.nearby.addEventListener('click',()=>{if(!userPos){requestLocation();return;}nearestMode=!nearestMode;els.nearby.classList.toggle('active',nearestMode);renderPlaces();if(nearestMode)renderNearby();});
els.openNow.addEventListener('click',()=>{openMode=!openMode;els.openNow.classList.toggle('active',openMode);showCount=12;renderPlaces();});
els.family.addEventListener('click',()=>{familyMode=!familyMode;els.family.classList.toggle('active',familyMode);showCount=12;renderPlaces();});
els.rain.addEventListener('click',()=>{rainMode=!rainMode;els.rain.classList.toggle('active',rainMode);showCount=12;renderPlaces();});
els.free.addEventListener('click',()=>{freeMode=!freeMode;els.free.classList.toggle('active',freeMode);showCount=12;renderPlaces();});
els.allBtn.addEventListener('click',()=>{activeCategory='全部';query='';nearestMode=false;openMode=false;familyMode=false;rainMode=false;freeMode=false;els.search.value='';document.querySelectorAll('.chip').forEach((x,i)=>x.classList.toggle('active',i===0));[els.nearby,els.openNow,els.family,els.rain,els.free].forEach(x=>x.classList.remove('active'));renderPlaces();});
els.reset.addEventListener('click',()=>els.allBtn.click());
const storedTheme=localStorage.getItem('yuanshan-theme');
if(storedTheme==='light') document.body.classList.add('light-mode');
els.theme.addEventListener('click',()=>{document.body.classList.toggle('light-mode');localStorage.setItem('yuanshan-theme',document.body.classList.contains('light-mode')?'light':'dark');});
els.share.addEventListener('click',async()=>{
  const data={title:'員山走走',text:'宜蘭員山美食、景點、親子與導航地圖',url:location.href};
  try{if(navigator.share){await navigator.share(data);}else{await navigator.clipboard.writeText(location.href);showToast('網址已複製');}}catch(e){}
});
els.grid.addEventListener('click',e=>{const b=e.target.closest('[data-focus]');if(b)focusPlace(b.dataset.focus);});
els.nearbyContent.addEventListener('click',e=>{const b=e.target.closest('[data-near]');if(b){focusPlace(b.dataset.near);document.getElementById('mapSection').scrollIntoView({behavior:'smooth'});}});
els.routeGrid.addEventListener('click',e=>{const b=e.target.closest('[data-route]');if(b)openRoute(+b.dataset.route);});

buildChips(); buildRoutes(); renderPlaces(); initMap(); loadOsmPois();
