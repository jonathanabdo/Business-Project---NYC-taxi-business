'use strict';
const DATA=window.TAXI_DATA;
const $=id=>document.getElementById(id);
const number=new Intl.NumberFormat('en-US');
const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const precise=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2});
const short=v=>v>=1e6?'$'+(v/1e6).toFixed(2)+'m':v>=1000?'$'+(v/1000).toFixed(0)+'k':money.format(v);
const months=[...new Set(DATA.rows.map(r=>r.pickup_month))].sort();
const monthName=m=>new Date(m+'-15T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'});
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
months.forEach(m=>$('month').add(new Option(monthName(m),m)));
[...new Set(DATA.rows.map(r=>r.pickup_borough))].sort().forEach(b=>$('borough').add(new Option(b,b)));
$('datasetSize').textContent=number.format(DATA.meta.raw_rows)+' original trip records · '+DATA.meta.source_columns+' source fields across eight monthly files';
$('quality').textContent=number.format(DATA.meta.included_rows)+' records are included; '+number.format(DATA.meta.excluded_rows)+' are excluded from charts. The project includes an audit by month and an inclusion flag for each prepared row.';
let current=[];
function total(rows){return rows.reduce((a,r)=>({trips:a.trips+r.trips,fare_usd:a.fare_usd+r.fare_usd,charges_usd:a.charges_usd+r.charges_usd}),{trips:0,fare_usd:0,charges_usd:0});}
function render(){
 const selectedMonth=$('month').value,borough=$('borough').value;
 const rows=DATA.rows.filter(r=>(selectedMonth==='all'||r.pickup_month===selectedMonth)&&(borough==='all'||r.pickup_borough===borough));
 const sums=total(rows);
 $('fare').textContent=money.format(sums.fare_usd);$('fare').title=precise.format(sums.fare_usd);
 $('trips').textContent=number.format(sums.trips);$('average').textContent=sums.trips?precise.format(sums.fare_usd/sums.trips):'—';$('charges').textContent=money.format(sums.charges_usd);$('charges').title=precise.format(sums.charges_usd);
 const chosenMonths=selectedMonth==='all'?months:[selectedMonth];
 current=chosenMonths.map(m=>{const s=total(rows.filter(r=>r.pickup_month===m));return{month:m,...s,average:s.trips?s.fare_usd/s.trips:0,perDay:s.fare_usd/new Date(Number(m.slice(0,4)),Number(m.slice(5)),0).getDate()};});
 $('scope').textContent=selectedMonth==='all'?'January–August':monthName(selectedMonth);
 drawTrend(current);
 const groups={};rows.forEach(r=>{groups[r.pickup_zone]=(groups[r.pickup_zone]||0)+r.fare_usd;});
 const top=Object.entries(groups).sort((a,b)=>b[1]-a[1]).slice(0,5);
 $('zones').innerHTML=top.length?top.map(([name,value])=>`<div class="bar-row"><div class="bar-label"><span>${escapeHtml(name)}</span><b>${short(value)}</b></div><div class="track"><div class="fill" style="width:${100*value/top[0][1]}%"></div></div></div>`).join(''):'<p>No included trips in this selection.</p>';
 $('tableBody').innerHTML=current.map(r=>`<tr><td>${monthName(r.month)}</td><td>${number.format(r.trips)}</td><td>${precise.format(r.fare_usd)}</td><td>${r.trips?precise.format(r.average):'—'}</td><td>${precise.format(r.perDay)}</td></tr>`).join('');
 if(!sums.trips){$('insight').textContent='No included trips match these filters. Try another month or borough.';return;}
 if(current.length>1){const peak=current.reduce((a,b)=>a.fare_usd>b.fare_usd?a:b);const first=current[0],last=current.at(-1);const change=first.fare_usd?(last.fare_usd/first.fare_usd-1)*100:null;$('insight').textContent=monthName(peak.month)+' has the highest base-fare total in this selection ('+money.format(peak.fare_usd)+'). '+(change===null?'':`August’s total is ${Math.abs(change).toFixed(1)}% ${change>=0?'above':'below'} January’s. `)+'Use trip counts and average fares below to investigate the difference; this comparison alone does not establish a cause.';}
 else{$('insight').textContent=top[0][0]+' contributes '+(top[0][1]/sums.fare_usd*100).toFixed(1)+'% of base fares in this selection. Treat this as a place to investigate customer demand, not evidence that a marketing campaign will succeed.';}
}
function drawTrend(rows){
 const w=590,h=265,l=59,r=18,t=24,b=40,plotw=w-l-r,ploth=h-t-b,max=Math.max(...rows.map(x=>x.fare_usd),1)*1.18;
 const x=i=>rows.length===1?l+plotw/2:l+i*plotw/(rows.length-1),y=v=>t+ploth-v/max*ploth;
 let svg=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="chartTitle chartDesc"><title id="chartTitle">Recorded base fares by month</title><desc id="chartDesc">${rows.map(v=>monthName(v.month)+': '+precise.format(v.fare_usd)).join('; ')}</desc>`;
 for(let i=0;i<=4;i++){let value=max*i/4,Y=y(value);svg+=`<line x1="${l}" x2="${w-r}" y1="${Y}" y2="${Y}" stroke="#e4e9e1"/><text x="${l-10}" y="${Y+4}" text-anchor="end" fill="#526a63" font-size="11">${short(value)}</text>`;}
 if(rows.length>1){const points=rows.map((v,i)=>`${x(i)},${y(v.fare_usd)}`).join(' ');svg+=`<polygon points="${l},${y(0)} ${points} ${w-r},${y(0)}" fill="#d9ecde" opacity=".6"/><polyline points="${points}" fill="none" stroke="#147569" stroke-width="3"/>`;}
 rows.forEach((v,i)=>{svg+=`<circle cx="${x(i)}" cy="${y(v.fare_usd)}" r="4" fill="#147569"><title>${monthName(v.month)}: ${precise.format(v.fare_usd)}</title></circle><text x="${x(i)}" y="${h-13}" text-anchor="middle" font-size="11" fill="#526a63">${monthName(v.month).slice(0,3)}</text>`;});$('trend').innerHTML=svg+'</svg>';
}
$('month').addEventListener('change',render);$('borough').addEventListener('change',render);$('reset').addEventListener('click',()=>{$('month').value='all';$('borough').value='all';render();});
$('download').addEventListener('click',()=>{let csv='month,pickup_borough,trips,base_fares_usd,average_base_fare_usd,base_fares_per_calendar_day_usd\n'+current.map(r=>[r.month,$('borough').value,r.trips,r.fare_usd.toFixed(2),r.average.toFixed(2),r.perDay.toFixed(2)].join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='taxi_business_selection.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
render();
