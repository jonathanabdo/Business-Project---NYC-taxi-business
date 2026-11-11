'use strict';
// Each map has its own filter state; the existing charts are unchanged.
const zoneShapes=window.TAXI_ZONES.zones, shapeById=new Map(zoneShapes.map(z=>[z.id,z]));
const svgNS='http://www.w3.org/2000/svg';
function svgEl(tag,attrs){const e=document.createElementNS(svgNS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;}
function zoneGroups(rows){const grouped=new Map();rows.forEach(r=>{const id=Number(r.zone_id);if(!grouped.has(id))grouped.set(id,{id,name:r.zone,borough:r.borough,trips:0,fare_cents:0,charges_cents:0});const g=grouped.get(id);g.trips+=r.trips;g.fare_cents+=r.fare_cents;g.charges_cents+=r.charges_cents;});return [...grouped.values()].sort((a,b)=>b.fare_cents-a.fare_cents||a.id-b.id);}
function makeZoneMap(type){
 const prefix=type+'Map',host=$(prefix+'Canvas'),detail=$(prefix+'Details'),ranking=$(prefix+'Ranking');
 const svg=svgEl('svg',{viewBox:'0 0 1000 1000',role:'group','aria-label':(type==='pickup'?'Pickup':'Drop-off')+' taxi-zone map. Drag to pan; use the buttons to zoom.'});
 const title=svgEl('title',{});title.textContent='NYC taxi zones, ranked by base fares';svg.append(title);
 const shapes=svgEl('g',{}),pins=svgEl('g',{});svg.append(shapes,pins);host.append(svg);
 let groups=[],byId=new Map(),top=[],selected=null,view=[0,0,1000,1000],drag=null,moved=false;
 const paths=new Map();
 function showDetails(id){selected=id;const g=byId.get(id),z=shapeById.get(id);if(!g&&!z)return;const rank=groups.findIndex(r=>r.id===id)+1;
 detail.innerHTML=`<strong>${esc(g?.name||z.name)}</strong><span>${esc(g?.borough||z.borough)} · Zone ${id}${rank?' · Rank '+rank:''}</span>`+(g?`<dl><div><dt>Base fares</dt><dd>${P.format(g.fare_cents/100)}</dd></div><div><dt>Trips</dt><dd>${N.format(g.trips)}</dd></div><div><dt>Passenger charges</dt><dd>${P.format(g.charges_cents/100)}</dd></div></dl>`:'<p>No included trips for this zone in the selected period and borough.</p>')+(!z?'<p>No mapped boundary is available for this location.</p>':'');
 paths.forEach((p,k)=>p.classList.toggle('zone-selected',k===id));ranking.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.zone)===id)));
 }
 zoneShapes.forEach(z=>{const path=svgEl('path',{d:z.path,'fill-rule':'evenodd','vector-effect':'non-scaling-stroke',class:'taxi-zone','data-zone':z.id});const t=svgEl('title',{});t.textContent=z.name;path.append(t);path.addEventListener('click',()=>{if(!moved)showDetails(z.id);});shapes.append(path);paths.set(z.id,path);});
 function applyView(){svg.setAttribute('viewBox',view.join(' '));const radius=view[2]*.023;pins.querySelectorAll('circle').forEach(c=>c.setAttribute('r',radius));pins.querySelectorAll('text').forEach(t=>t.setAttribute('font-size',radius*1.1));}
 function fit(ids){const zz=ids.map(id=>shapeById.get(id)).filter(Boolean);if(!zz.length){view=[0,0,1000,1000];applyView();return;}const a=Math.min(...zz.map(z=>z.bounds[0])),b=Math.min(...zz.map(z=>z.bounds[1])),c=Math.max(...zz.map(z=>z.bounds[2])),d=Math.max(...zz.map(z=>z.bounds[3]));const side=Math.max(c-a,d-b,70)*1.2;view=[(a+c-side)/2,(b+d-side)/2,side,side];applyView();}
 function zoom(factor){const size=Math.min(1400,Math.max(35,view[2]*factor));view=[view[0]+(view[2]-size)/2,view[1]+(view[3]-size)/2,size,size];applyView();}
 $(prefix+'In').addEventListener('click',()=>zoom(.7));$(prefix+'Out').addEventListener('click',()=>zoom(1/.7));$(prefix+'Fit').addEventListener('click',()=>fit(top.map(r=>r.id)));$(prefix+'All').addEventListener('click',()=>fit(zoneShapes.map(z=>z.id)));
 svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,view:[...view]};moved=false;svg.setPointerCapture(e.pointerId);});
 svg.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;const scale=drag.view[2]/svg.getBoundingClientRect().width;view=[drag.view[0]-dx*scale,drag.view[1]-dy*scale,...drag.view.slice(2)];applyView();});
 svg.addEventListener('pointerup',e=>{const wasDrag=!!drag;drag=null;if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);if(wasDrag&&!moved){const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-zone]');if(el&&svg.contains(el))showDetails(Number(el.dataset.zone));}});
 svg.addEventListener('pointercancel',()=>{drag=null;});
 function render(){groups=zoneGroups(chosen(prefix,type));byId=new Map(groups.map(g=>[g.id,g]));top=groups.slice(0,5);const ranked=new Set(top.map(g=>g.id));
 paths.forEach((p,id)=>{p.classList.toggle('zone-top',ranked.has(id));p.classList.toggle('zone-included',byId.has(id));p.classList.remove('zone-selected');});
 pins.replaceChildren();top.forEach((g,i)=>{const z=shapeById.get(g.id);if(!z)return;const marker=svgEl('g',{transform:`translate(${z.point[0]} ${z.point[1]})`,'data-zone':g.id,class:'zone-pin'});marker.append(svgEl('circle',{r:12}));const text=svgEl('text',{'text-anchor':'middle','dominant-baseline':'central','pointer-events':'none'});text.textContent=i+1;marker.append(text);marker.addEventListener('click',()=>{if(!moved)showDetails(g.id);});pins.append(marker);});
 ranking.innerHTML=top.length?top.map((g,i)=>`<button type="button" data-zone="${g.id}" aria-pressed="false"><span class="rank-number">${i+1}</span><span>${esc(g.name)}<small>${N.format(g.trips)} trips${shapeById.has(g.id)?'':' · No mapped boundary'}</small></span><b>${M.format(g.fare_cents/100)}</b></button>`).join(''):'<p>No included trips in this selection.</p>';
 ranking.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>showDetails(Number(b.dataset.zone))));
 const unmapped=groups.filter(g=>!shapeById.has(g.id)).reduce((a,g)=>a+g.trips,0);
 $(prefix+'Note').textContent=($ (prefix+'Year').value==='all'?'January 2020–August 2026':$(prefix+'Year').selectedOptions[0].text)+' · '+$(prefix+'Borough').selectedOptions[0].text+'. '+(unmapped?N.format(unmapped)+' trips have no mapped zone boundary; they remain in the dashboard totals.':'All locations in this selection have mapped boundaries.');
 fit(top.map(g=>g.id));if(top.length)showDetails(top[0].id);else{selected=null;detail.innerHTML='<p>No included trips in this selection. Choose another year or borough.</p>';}
 }
 setup(prefix,type,render);render();
}
makeZoneMap('pickup');makeZoneMap('dropoff');
