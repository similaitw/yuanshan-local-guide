const places = window.YUANSHAN_PLACES || [];
const routes = window.YUANSHAN_ROUTES || [];
const $ = (s) => document.querySelector(s);
const els = {
  chips: $('#chips'), grid: $('#placesGrid'), resultCount: $('#resultCount'), search: $('#searchInput'), clearSearch: $('#clearSearch'),
  loadMore: $('#loadMoreBtn'), locate: $('#locateBtn'), nearby: $('#nearbyBtn'), family: $('#familyBtn'), rain: $('#rainBtn'), free: $('#freeBtn'),
  reset: $('#resetBtn'), share: $('#shareBtn'), tripSelect: $('#tripSelect'), routeStops: $('#routeStops'), routeEmpty: $('#routeEmpty'),
  clearRoute: $('#clearRouteBtn'), openRoute: $('#openRouteBtn'), mapStatus: $('#mapStatus'), mapFrame: $('#mapFrame'),
  mapPlaceSelect: $('#mapPlaceSelect'), openGoogleMap: $('#openGoogleMap'),
  mobileFilterBtn: $('#mobileFilterBtn'), mobileFilterLabel: $('#mobileFilterLabel'),
  mobileFilterDialog: $('#mobileFilterDialog'), mobileFilterClose: $('#mobileFilterClose'),
  mobileCategoryGrid: $('#mobileCategoryGrid'), mobileFilterReset: $('#mobileFilterReset'), mobileFilterDone: $('#mobileFilterDone'),
  mobileMapBtn: $('#mobileMapBtn'), mobileListBtn: $('#mobileListBtn')
};

const categories = [['全部','全部'],['小吃','🍜 小吃'],['正餐','🍗 正餐'],['咖啡','☕ 咖啡'],['自然','🌿 自然'],['農場','🚜 農場'],['親子','👨‍👩‍👧 親子'],['文化','🏯 文化'],['酒廠','🥃 酒廠']];
let activeCategory='全部', query='', showCount=16, userPos=null, nearbyMode=false, familyMode=false, rainMode=false, freeMode=false;
let routeIds=[], selectedId=places[0]?.id || '';
const coordById=new Map(), geocodeQueue=new Map();
let toastTimer;

const normal=(s='')=>s.toLowerCase().replace(/[\s·・｜|()（）\-—_]/g,'').replace(/宜蘭|員山鄉|員山/g,'');
function toast(msg){clearTimeout(toastTimer);const el=$('#toast');el.textContent=msg;el.classList.add('show');toastTimer=setTimeout(()=>el.classList.remove('show'),2400);}
function distanceKm(a,b){const R=6371,r=d=>d*Math.PI/180,dLat=r(b.lat-a.lat),dLon=r(b.lng-a.lng),x=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
function labelFor(p){return `${p.name} ${p.address}`;}
function mapEmbed(query){return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;}
function googleSearchUrl(p){return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(labelFor(p))}`;}
function googleDirectionsUrl(ids=routeIds){
  const ps=ids.map(id=>places.find(p=>p.id===id)).filter(Boolean);
  if(!ps.length)return '';
  if(ps.length===1)return googleSearchUrl(ps[0]);
  const limited=ps.slice(0,5);
  const origin=userPos?`${userPos.lat},${userPos.lng}`:labelFor(limited[0]);
  const destination=labelFor(limited.at(-1));
  const mids=(userPos?limited.slice(0,-1):limited.slice(1,-1)).map(labelFor);
  const p=new URLSearchParams({api:'1',origin,destination,travelmode:'driving',dir_action:'navigate'});
  if(mids.length)p.set('waypoints',mids.join('|'));
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}

function buildTripSelect(){
  els.tripSelect.innerHTML='<option value="">自己排路線</option>'+routes.map((r,i)=>`<option value="${i}">${r.icon} ${r.name}</option>`).join('');
}
function buildChips(){
  els.chips.innerHTML=categories.map(([k,l])=>`<button class="chip ${k==='全部'?'active':''}" data-cat="${k}" type="button">${l}</button>`).join('');
}
function buildMobileCategories(){
  els.mobileCategoryGrid.innerHTML=categories.map(([k,l])=>{
    const match=l.match(/^([^\s]+)\s(.+)$/);
    const icon=k==='全部'?'✦':(match?.[1]||'•');
    const label=k==='全部'?'全部':(match?.[2]||l);
    return `<button type="button" data-mobile-cat="${k}" class="${k==='全部'?'active':''}"><span>${icon}</span>${label}</button>`;
  }).join('');
}
function syncFilterControls(){
  document.querySelectorAll('.chip').forEach(b=>b.classList.toggle('active',b.dataset.cat===activeCategory));
  document.querySelectorAll('[data-mobile-cat]').forEach(b=>b.classList.toggle('active',b.dataset.mobileCat===activeCategory));
  if(els.mobileFilterLabel) els.mobileFilterLabel.textContent=activeCategory;
  document.querySelectorAll('[data-mobile-filter]').forEach(b=>{
    const key=b.dataset.mobileFilter;
    const active=key==='family'?familyMode:key==='rain'?rainMode:key==='free'?freeMode:key==='nearby'?nearbyMode:false;
    b.classList.toggle('active',active);
  });
  els.family.classList.toggle('active',familyMode);
  els.rain.classList.toggle('active',rainMode);
  els.free.classList.toggle('active',freeMode);
  els.nearby.classList.toggle('active',nearbyMode);
}
function setMobileView(view,scroll=false){
  document.body.dataset.mobileView=view;
  els.mobileMapBtn?.classList.toggle('active',view==='map');
  els.mobileListBtn?.classList.toggle('active',view==='list');
  if(scroll) document.querySelector('.explore-layout')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function resetFilters(){
  activeCategory='全部';query='';nearbyMode=familyMode=rainMode=freeMode=false;showCount=16;
  els.search.value='';syncFilterControls();renderList();
}
function passesSmart(p){
  const tags=p.tags||[];
  if(familyMode && !(p.cat==='親子'||p.cat==='農場'||tags.some(t=>/親子|動物|DIY|公園/.test(t))))return false;
  if(rainMode && !(p.cat==='酒廠'||tags.some(t=>/室內|觀光工廠|博物館|雨天/.test(t))))return false;
  if(freeMode && !tags.some(t=>/免費/.test(t)))return false;
  return true;
}
function filteredPlaces(){
  const q=normal(query);
  let list=places.filter(p=>(activeCategory==='全部'||p.cat===activeCategory)&&passesSmart(p));
  if(q)list=list.filter(p=>normal([p.name,p.address,p.desc,p.cat,...(p.tags||[])].join(' ')).includes(q));
  if(nearbyMode&&userPos)list=list.map(p=>({...p,_d:coordById.has(p.id)?distanceKm(userPos,coordById.get(p.id)):Infinity})).sort((a,b)=>a._d-b._d);
  return list;
}
function cardHtml(p){
  const c=coordById.get(p.id),d=userPos&&c?distanceKm(userPos,c):null,added=routeIds.includes(p.id),selected=p.id===selectedId;
  return `<article class="place-card ${selected?'active':''}" data-id="${p.id}">
    <span class="place-emoji">${p.emoji}</span>
    <div class="place-main">
      <div class="place-title-row"><div><h3>${p.name}</h3><div class="place-meta"><span class="tag">${p.cat}</span>${(p.tags||[]).slice(0,1).map(t=>`<span class="tag">${t}</span>`).join('')}</div></div><span class="place-distance">${d==null?'':d<1?`${Math.round(d*1000)} m`:`${d.toFixed(1)} km`}</span></div>
      <div class="place-address">${p.address}</div>
      <div class="place-actions"><button class="focus-btn" data-focus="${p.id}" type="button">地圖</button><button class="add-route-btn ${added?'added':''}" data-route-add="${p.id}" type="button">${added?'✓ 已加入':'＋ 路線'}</button><a class="nav-link" href="${googleSearchUrl(p)}" target="_blank" rel="noopener">導航 ↗</a></div>
    </div>
  </article>`;
}
function renderList(){
  const list=filteredPlaces();
  els.grid.innerHTML=list.slice(0,showCount).map(cardHtml).join('')||'<div class="map-placeholder"><b>沒有結果</b></div>';
  els.resultCount.textContent=`${list.length} 個${nearbyMode&&userPos?' · 距離排序':''}`;
  els.loadMore.classList.toggle('hidden',showCount>=list.length);
  syncMapSelect(list);
}
function renderRoute(){
  const ps=routeIds.map(id=>places.find(p=>p.id===id)).filter(Boolean);
  els.routeEmpty.hidden=ps.length>0;
  els.routeStops.innerHTML=ps.map((p,i)=>`<li class="route-stop" data-route-id="${p.id}"><div><b>${p.name}</b><small>${p.cat}</small></div><div class="route-stop-actions"><button data-up="${p.id}" ${i===0?'disabled':''}>↑</button><button data-down="${p.id}" ${i===ps.length-1?'disabled':''}>↓</button><button data-remove="${p.id}">×</button></div></li>`).join('');
  els.openRoute.disabled=ps.length===0;
  renderList();
}
function addToRoute(id){if(!routeIds.includes(id)){routeIds.push(id);els.tripSelect.value='';renderRoute();toast('已加入路線');}}
function moveRoute(id,delta){const i=routeIds.indexOf(id),j=i+delta;if(i<0||j<0||j>=routeIds.length)return;[routeIds[i],routeIds[j]]=[routeIds[j],routeIds[i]];renderRoute();}

function syncMapSelect(list=filteredPlaces()){
  els.mapPlaceSelect.innerHTML='<option value="">員山鄉總覽</option>'+list.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  if(selectedId && !list.some(p=>p.id===selectedId)){
    const p=places.find(x=>x.id===selectedId);
    if(p)els.mapPlaceSelect.insertAdjacentHTML('beforeend',`<option value="${p.id}">${p.name}（目前選取）</option>`);
  }
  els.mapPlaceSelect.value=selectedId||'';
  updateMap();
}
function updateMap(){
  const p=places.find(x=>x.id===selectedId);
  const query=p?labelFor(p):'宜蘭縣員山鄉';
  const src=mapEmbed(query);
  if(els.mapFrame.getAttribute('src')!==src)els.mapFrame.src=src;
  els.openGoogleMap.href=p?googleSearchUrl(p):'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('宜蘭縣員山鄉');
  els.mapStatus.textContent=p?`目前：${p.name}`:'免 API Key';
}
function focusPlace(id){
  selectedId=id;
  updateMap();
  els.mapPlaceSelect.value=id;
  document.querySelectorAll('.place-card').forEach(c=>c.classList.toggle('active',c.dataset.id===id));
  if(matchMedia('(max-width: 700px)').matches){
    setMobileView('map',true);
  }else{
    document.querySelector(`.place-card[data-id="${id}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
}

async function geocodePlace(p){
  if(coordById.has(p.id))return coordById.get(p.id);
  if(geocodeQueue.has(p.id))return geocodeQueue.get(p.id);
  const task=(async()=>{
    const ck='geo:'+p.id;
    try{const cached=JSON.parse(localStorage.getItem(ck)||'null');if(cached?.lat){coordById.set(p.id,cached);return cached;}}catch{}
    try{
      const q=encodeURIComponent(`${p.name}, ${p.address}, 台灣`);
      const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=tw&q=${q}`,{headers:{'Accept-Language':'zh-TW,zh;q=0.9'}});
      const j=await r.json();
      if(j[0]){const c={lat:+j[0].lat,lng:+j[0].lon};coordById.set(p.id,c);localStorage.setItem(ck,JSON.stringify(c));return c;}
    }catch{}
    return null;
  })();
  geocodeQueue.set(p.id,task);const out=await task;geocodeQueue.delete(p.id);return out;
}
async function resolveDistances(){
  let done=0;
  for(const p of places){
    await geocodePlace(p);done++;
    if(done%5===0||done===places.length){els.mapStatus.textContent=`距離資料 ${done}/${places.length}`;renderList();}
    await new Promise(r=>setTimeout(r,350));
  }
  updateMap();
}
function requestLocation(){
  if(!navigator.geolocation){toast('瀏覽器不支援定位');return;}
  els.locate.disabled=true;els.locate.textContent='定位中…';
  navigator.geolocation.getCurrentPosition(pos=>{
    userPos={lat:pos.coords.latitude,lng:pos.coords.longitude};
    els.locate.disabled=false;els.locate.textContent='✓ 已定位';nearbyMode=true;syncFilterControls();
    toast('已取得位置，正在計算距離');resolveDistances();
  },()=>{els.locate.disabled=false;els.locate.textContent='◎ 使用我的位置';toast('目前無法取得位置');},{enableHighAccuracy:true,timeout:12000,maximumAge:120000});
}

els.search.addEventListener('input',e=>{query=e.target.value.trim();showCount=16;renderList();});
els.clearSearch.addEventListener('click',()=>{query='';els.search.value='';renderList();});
els.loadMore.addEventListener('click',()=>{showCount+=16;renderList();});
els.locate.addEventListener('click',requestLocation);
els.nearby.addEventListener('click',()=>{if(!userPos){requestLocation();return;}nearbyMode=!nearbyMode;syncFilterControls();renderList();});
els.family.addEventListener('click',()=>{familyMode=!familyMode;syncFilterControls();renderList();});
els.rain.addEventListener('click',()=>{rainMode=!rainMode;syncFilterControls();renderList();});
els.free.addEventListener('click',()=>{freeMode=!freeMode;syncFilterControls();renderList();});
els.reset.addEventListener('click',resetFilters);
els.chips.addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(!b)return;activeCategory=b.dataset.cat;showCount=16;syncFilterControls();renderList();});
els.tripSelect.addEventListener('change',()=>{if(els.tripSelect.value==='')return;const r=routes[+els.tripSelect.value];routeIds=[...(r?.ids||[])];renderRoute();toast(`已套用：${r.name}`);});
els.grid.addEventListener('click',e=>{const f=e.target.closest('[data-focus]'),a=e.target.closest('[data-route-add]');if(f)focusPlace(f.dataset.focus);if(a)addToRoute(a.dataset.routeAdd);});
els.mapPlaceSelect.addEventListener('change',()=>{selectedId=els.mapPlaceSelect.value||'';updateMap();renderList();});
els.routeStops.addEventListener('click',e=>{const up=e.target.closest('[data-up]'),down=e.target.closest('[data-down]'),rm=e.target.closest('[data-remove]');if(up)moveRoute(up.dataset.up,-1);if(down)moveRoute(down.dataset.down,1);if(rm){routeIds=routeIds.filter(id=>id!==rm.dataset.remove);els.tripSelect.value='';renderRoute();}});
els.clearRoute.addEventListener('click',()=>{routeIds=[];els.tripSelect.value='';renderRoute();});
els.openRoute.addEventListener('click',()=>{const url=googleDirectionsUrl();if(url)window.open(url,'_blank','noopener');});
els.share.addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:'員山走走',text:'員山美食景點與路線規劃',url:location.href});else{await navigator.clipboard.writeText(location.href);toast('網址已複製');}}catch{}});
els.mobileFilterBtn?.addEventListener('click',()=>els.mobileFilterDialog.showModal());
els.mobileFilterClose?.addEventListener('click',()=>els.mobileFilterDialog.close());
els.mobileFilterDone?.addEventListener('click',()=>els.mobileFilterDialog.close());
els.mobileFilterReset?.addEventListener('click',()=>{resetFilters();});
els.mobileCategoryGrid?.addEventListener('click',e=>{
  const b=e.target.closest('[data-mobile-cat]');if(!b)return;
  activeCategory=b.dataset.mobileCat;showCount=16;syncFilterControls();renderList();
});
els.mobileFilterDialog?.addEventListener('click',e=>{
  const b=e.target.closest('[data-mobile-filter]');if(!b)return;
  const key=b.dataset.mobileFilter;
  if(key==='family') familyMode=!familyMode;
  if(key==='rain') rainMode=!rainMode;
  if(key==='free') freeMode=!freeMode;
  if(key==='nearby'){
    if(!userPos){els.mobileFilterDialog.close();requestLocation();return;}
    nearbyMode=!nearbyMode;
  }
  syncFilterControls();renderList();
});
els.mobileMapBtn?.addEventListener('click',()=>setMobileView('map'));
els.mobileListBtn?.addEventListener('click',()=>setMobileView('list'));

document.body.dataset.mobileView='list';
buildTripSelect();buildChips();buildMobileCategories();syncFilterControls();renderRoute();updateMap();