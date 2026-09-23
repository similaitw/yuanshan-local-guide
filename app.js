const places = window.YUANSHAN_PLACES || [];
const routes = window.YUANSHAN_ROUTES || [];
const $ = (s) => document.querySelector(s);
const els = {
  chips: $('#chips'), grid: $('#placesGrid'), resultCount: $('#resultCount'), search: $('#searchInput'), clearSearch: $('#clearSearch'),
  loadMore: $('#loadMoreBtn'), locate: $('#locateBtn'), nearby: $('#nearbyBtn'), family: $('#familyBtn'), rain: $('#rainBtn'), free: $('#freeBtn'),
  reset: $('#resetBtn'), share: $('#shareBtn'), tripSelect: $('#tripSelect'), routeStops: $('#routeStops'), routeEmpty: $('#routeEmpty'),
  clearRoute: $('#clearRouteBtn'), openRoute: $('#openRouteBtn'), mapStatus: $('#mapStatus'), mapEl: $('#map')
};

const categories = [['全部','全部'],['小吃','🍜 小吃'],['正餐','🍗 正餐'],['咖啡','☕ 咖啡'],['自然','🌿 自然'],['農場','🚜 農場'],['親子','👨‍👩‍👧 親子'],['文化','🏯 文化'],['酒廠','🥃 酒廠']];
let activeCategory='全部', query='', showCount=16, userPos=null, nearbyMode=false, familyMode=false, rainMode=false, freeMode=false;
let routeIds=[];
let map=null, infoWindow=null, userMarker=null;
const coordById=new Map(), markerById=new Map(), geocodeQueue=new Map();
let toastTimer;

const normal = (s='') => s.toLowerCase().replace(/[\s·・｜|()（）\-—_]/g,'').replace(/宜蘭|員山鄉|員山/g,'');
function toast(msg){ clearTimeout(toastTimer); const el=$('#toast'); el.textContent=msg; el.classList.add('show'); toastTimer=setTimeout(()=>el.classList.remove('show'),2400); }
function distanceKm(a,b){const R=6371,r=d=>d*Math.PI/180,dLat=r(b.lat-a.lat),dLon=r(b.lng-a.lng),x=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
function labelFor(p){ return `${p.name} ${p.address}`; }
function googleSearchUrl(p){ return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(labelFor(p))}`; }
function googleDirectionsUrl(ids=routeIds){
  const ps=ids.map(id=>places.find(p=>p.id===id)).filter(Boolean);
  if(!ps.length) return '';
  if(ps.length===1) return googleSearchUrl(ps[0]);
  const limited=ps.slice(0,5);
  const origin=userPos?`${userPos.lat},${userPos.lng}`:labelFor(limited[0]);
  const destination=labelFor(limited.at(-1));
  const mids=(userPos?limited.slice(0,-1):limited.slice(1,-1)).map(labelFor);
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${mids.length?`&waypoints=${encodeURIComponent(mids.join('|'))}`:''}&travelmode=driving&utm_source=yuanshan_walk&utm_campaign=directions_request`;
}

function buildTripSelect(){
  els.tripSelect.innerHTML='<option value="">自己排路線</option>'+routes.map((r,i)=>`<option value="${i}">${r.icon} ${r.name}</option>`).join('');
}
function buildChips(){
  els.chips.innerHTML=categories.map(([k,l])=>`<button class="chip ${k==='全部'?'active':''}" data-cat="${k}" type="button">${l}</button>`).join('');
}
function passesSmart(p){
  const tags=p.tags||[];
  if(familyMode && !(p.cat==='親子'||p.cat==='農場'||tags.some(t=>/親子|動物|DIY|公園/.test(t)))) return false;
  if(rainMode && !(p.cat==='酒廠'||tags.some(t=>/室內|觀光工廠|博物館|雨天/.test(t)))) return false;
  if(freeMode && !tags.some(t=>/免費/.test(t))) return false;
  return true;
}
function filteredPlaces(){
  const q=normal(query);
  let list=places.filter(p=>(activeCategory==='全部'||p.cat===activeCategory)&&passesSmart(p));
  if(q) list=list.filter(p=>normal([p.name,p.address,p.desc,p.cat,...(p.tags||[])].join(' ')).includes(q));
  if(nearbyMode&&userPos) list=list.map(p=>({...p,_d:coordById.has(p.id)?distanceKm(userPos,coordById.get(p.id)):Infinity})).sort((a,b)=>a._d-b._d);
  return list;
}
function cardHtml(p){
  const c=coordById.get(p.id),d=userPos&&c?distanceKm(userPos,c):null,added=routeIds.includes(p.id);
  return `<article class="place-card" data-id="${p.id}">
    <span class="place-emoji">${p.emoji}</span>
    <div class="place-main">
      <div class="place-title-row"><div><h3>${p.name}</h3><div class="place-meta"><span class="tag">${p.cat}</span>${(p.tags||[]).slice(0,2).map(t=>`<span class="tag">${t}</span>`).join('')}</div></div><span class="place-distance">${d==null?'':d<1?`${Math.round(d*1000)} m`:`${d.toFixed(1)} km`}</span></div>
      <p class="place-desc">${p.desc}</p><div class="place-address">${p.address}</div>
      <div class="place-actions"><button class="focus-btn" data-focus="${p.id}" type="button">地圖</button><button class="add-route-btn ${added?'added':''}" data-route-add="${p.id}" type="button">${added?'✓ 已加入':'＋ 路線'}</button><a class="nav-link" href="${googleSearchUrl(p)}" target="_blank" rel="noopener">Google Maps ↗</a></div>
    </div>
  </article>`;
}
function renderList(){
  const list=filteredPlaces();
  els.grid.innerHTML=list.slice(0,showCount).map(cardHtml).join('')||'<div class="map-placeholder"><b>沒有符合的地點</b><p>換個關鍵字或清除篩選看看。</p></div>';
  els.resultCount.textContent=`${list.length} 個地點${nearbyMode&&userPos?' · 依距離':''}`;
  els.loadMore.classList.toggle('hidden',showCount>=list.length);
  updateMarkerVisibility(list.map(p=>p.id));
}
function renderRoute(){
  const ps=routeIds.map(id=>places.find(p=>p.id===id)).filter(Boolean);
  els.routeEmpty.hidden=ps.length>0;
  els.routeStops.innerHTML=ps.map((p,i)=>`<li class="route-stop" data-route-id="${p.id}"><div><b>${p.name}</b><small>${p.cat}</small></div><div class="route-stop-actions"><button data-up="${p.id}" ${i===0?'disabled':''} title="往前">↑</button><button data-down="${p.id}" ${i===ps.length-1?'disabled':''} title="往後">↓</button><button data-remove="${p.id}" title="移除">×</button></div></li>`).join('');
  els.openRoute.disabled=ps.length===0;
  renderList();
  updateRouteMarkers();
}
function addToRoute(id){ if(!routeIds.includes(id)){ routeIds.push(id); els.tripSelect.value=''; renderRoute(); toast('已加入路線'); } }
function moveRoute(id,delta){const i=routeIds.indexOf(id),j=i+delta;if(i<0||j<0||j>=routeIds.length)return;[routeIds[i],routeIds[j]]=[routeIds[j],routeIds[i]];renderRoute();}
function updateRouteMarkers(){
  if(!map) return;
  markerById.forEach((marker,id)=>{ const i=routeIds.indexOf(id); if(marker.setLabel) marker.setLabel(i>=0?{text:String(i+1),color:'#fff',fontWeight:'800'}:null); });
}

async function loadGoogleMaps(){
  const key=window.GOOGLE_MAPS_API_KEY||'';
  if(!key){ els.mapStatus.textContent='需要設定 Google Maps API key'; return; }
  await new Promise((resolve,reject)=>{ window.__initYuanshanGoogleMap=resolve; const s=document.createElement('script'); s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=__initYuanshanGoogleMap&language=zh-TW&region=TW`; s.async=true; s.onerror=reject; document.head.appendChild(s); });
  initGoogleMap();
}
function initGoogleMap(){
  els.mapEl.innerHTML='';
  map=new google.maps.Map(els.mapEl,{center:{lat:24.744,lng:121.687},zoom:12,mapTypeControl:false,streetViewControl:false,fullscreenControl:true,gestureHandling:'greedy'});
  infoWindow=new google.maps.InfoWindow();
  els.mapStatus.textContent='Google 地圖已載入';
  resolveAllCoordinates();
}
function addMarker(p,c){
  if(!map||markerById.has(p.id))return;
  const marker=new google.maps.Marker({position:c,map,title:p.name});
  marker.addListener('click',()=>{ infoWindow.setContent(`<div class="gm-info"><b>${p.emoji} ${p.name}</b><p>${p.address}</p><button onclick="window.__addRouteFromMap('${p.id}')">＋ 加入路線</button></div>`); infoWindow.open({map,anchor:marker}); highlightCard(p.id); });
  markerById.set(p.id,marker);
  updateRouteMarkers();
}
window.__addRouteFromMap=addToRoute;
function updateMarkerVisibility(visibleIds){ const set=new Set(visibleIds); markerById.forEach((m,id)=>m.setMap(set.has(id)?map:null)); }
function highlightCard(id){ document.querySelectorAll('.place-card').forEach(c=>c.classList.toggle('active',c.dataset.id===id)); document.querySelector(`.place-card[data-id="${id}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest'}); }
async function geocodePlace(p){
  if(coordById.has(p.id))return coordById.get(p.id); if(geocodeQueue.has(p.id))return geocodeQueue.get(p.id);
  const task=(async()=>{ const ck='geo:'+p.id; try{const cached=JSON.parse(localStorage.getItem(ck)||'null');if(cached?.lat){coordById.set(p.id,cached);return cached;}}catch{}
    try{const q=encodeURIComponent(`${p.name}, ${p.address}, 台灣`),r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=tw&q=${q}`,{headers:{'Accept-Language':'zh-TW,zh;q=0.9'}}),j=await r.json();if(j[0]){const c={lat:+j[0].lat,lng:+j[0].lon};coordById.set(p.id,c);localStorage.setItem(ck,JSON.stringify(c));return c;}}catch{}return null; })();
  geocodeQueue.set(p.id,task); const out=await task; geocodeQueue.delete(p.id); return out;
}
async function resolveAllCoordinates(){
  let done=0; for(const p of places){ const c=await geocodePlace(p); if(c)addMarker(p,c); done++; if(done%5===0||done===places.length){els.mapStatus.textContent=`Google 地圖 · ${done}/${places.length} 地點`;renderList();} await new Promise(r=>setTimeout(r,360)); }
  els.mapStatus.textContent='Google 地圖 · 地點載入完成';
}
async function focusPlace(id){
  const p=places.find(x=>x.id===id); if(!p)return; const c=await geocodePlace(p); if(!c){window.open(googleSearchUrl(p),'_blank','noopener');return;} if(map){addMarker(p,c);map.panTo(c);map.setZoom(15);google.maps.event.trigger(markerById.get(id),'click');}else window.open(googleSearchUrl(p),'_blank','noopener');
}
function requestLocation(){
  if(!navigator.geolocation){toast('瀏覽器不支援定位');return;} els.locate.disabled=true; els.locate.textContent='定位中…';
  navigator.geolocation.getCurrentPosition(pos=>{userPos={lat:pos.coords.latitude,lng:pos.coords.longitude};els.locate.disabled=false;els.locate.textContent='✓ 已定位';nearbyMode=true;els.nearby.classList.add('active');if(map){userMarker?.setMap(null);userMarker=new google.maps.Marker({position:userPos,map,title:'你的位置',icon:{path:google.maps.SymbolPath.CIRCLE,scale:8,fillColor:'#2d9ee8',fillOpacity:1,strokeColor:'#fff',strokeWeight:3}});map.panTo(userPos);map.setZoom(12);}renderList();toast('已依距離排序');},()=>{els.locate.disabled=false;els.locate.textContent='◎ 使用我的位置';toast('目前無法取得位置');},{enableHighAccuracy:true,timeout:12000,maximumAge:120000});
}

els.search.addEventListener('input',e=>{query=e.target.value.trim();showCount=16;renderList();});
els.clearSearch.addEventListener('click',()=>{query='';els.search.value='';renderList();});
els.loadMore.addEventListener('click',()=>{showCount+=16;renderList();});
els.locate.addEventListener('click',requestLocation);
els.nearby.addEventListener('click',()=>{if(!userPos){requestLocation();return;}nearbyMode=!nearbyMode;els.nearby.classList.toggle('active',nearbyMode);renderList();});
els.family.addEventListener('click',()=>{familyMode=!familyMode;els.family.classList.toggle('active',familyMode);renderList();});
els.rain.addEventListener('click',()=>{rainMode=!rainMode;els.rain.classList.toggle('active',rainMode);renderList();});
els.free.addEventListener('click',()=>{freeMode=!freeMode;els.free.classList.toggle('active',freeMode);renderList();});
els.reset.addEventListener('click',()=>{activeCategory='全部';query='';nearbyMode=familyMode=rainMode=freeMode=false;els.search.value='';document.querySelectorAll('.chip').forEach((x,i)=>x.classList.toggle('active',i===0));[els.nearby,els.family,els.rain,els.free].forEach(x=>x.classList.remove('active'));renderList();});
els.chips.addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(!b)return;activeCategory=b.dataset.cat;showCount=16;document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x===b));renderList();});
els.tripSelect.addEventListener('change',()=>{if(els.tripSelect.value==='')return;const r=routes[+els.tripSelect.value];routeIds=[...(r?.ids||[])];renderRoute();toast(`已套用：${r.name}`);});
els.grid.addEventListener('click',e=>{const f=e.target.closest('[data-focus]'),a=e.target.closest('[data-route-add]');if(f)focusPlace(f.dataset.focus);if(a)addToRoute(a.dataset.routeAdd);});
els.routeStops.addEventListener('click',e=>{const up=e.target.closest('[data-up]'),down=e.target.closest('[data-down]'),rm=e.target.closest('[data-remove]');if(up)moveRoute(up.dataset.up,-1);if(down)moveRoute(down.dataset.down,1);if(rm){routeIds=routeIds.filter(id=>id!==rm.dataset.remove);els.tripSelect.value='';renderRoute();}});
els.clearRoute.addEventListener('click',()=>{routeIds=[];els.tripSelect.value='';renderRoute();});
els.openRoute.addEventListener('click',()=>{const url=googleDirectionsUrl();if(url)window.open(url,'_blank','noopener');});
els.share.addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:'員山走走',text:'員山美食景點與路線規劃',url:location.href});else{await navigator.clipboard.writeText(location.href);toast('網址已複製');}}catch{}});

buildTripSelect();buildChips();renderRoute();loadGoogleMaps().catch(()=>{els.mapStatus.textContent='Google 地圖載入失敗';});
