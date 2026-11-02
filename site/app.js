/* Odoo Egypt market monitor - enhanced static dashboard. Data: data.json (public market observations). */
(function(){
"use strict";
var S={data:null,view:'overview',pQ:'',pTier:'All',pSort:'refs',cQ:'',cInd:'',cTier:'All',cSort:'name',cNew:false,cShown:60,
       aType:'All',aPeriod:'30',aFrom:'',aTo:'',nQ:'',arQ:''};
var TIERC={Gold:'b-gold',Silver:'b-silver',Ready:'b-ready'};
var VIEWS=[['overview','Overview'],['partners','Partners'],['clients','Clients'],['activity','Activity'],['alerts','Alerts'],['trends','Trends'],['archive','Archive']];
var SHEET='https://docs.google.com/spreadsheets/d/1YFGwlImLwnHTlSDXVc-T1lIgrNZLmK81mZEcMx1Mi3Q/edit';
var SRC='https://www.odoo.com/partners/country/egypt-64';
var CANON='https://files.instinct.com/dm6ngmf26sgh-odoo-egypt-market-monitor';

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function fmt(n){return (n==null||isNaN(+n))?'-':(+n).toLocaleString('en-US')}
function $(q,r){return (r||document).querySelector(q)}
function tierB(t){return '<span class="badge '+(TIERC[t]||'b-neutral')+'">'+esc(t)+'</span>'}
function extIcon(){return '<svg class="ext" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M7 17L17 7M9 7h8v8"/></svg>'}
function searchIcon(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>'}
function fdate(iso){if(!iso)return '-';var d=new Date(iso);if(isNaN(d))return iso.slice(0,10);
  return d.toLocaleString('en-GB',{timeZone:'Africa/Cairo',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
function dtype(c){
  var t=c[1];
  if(t==='Added reference')return S.earliest[c[2]]===c[0]&&S.earliest[c[2]]>S.data.trackingStart?['New client','b-add']:['Added','b-add'];
  if(t==='Removed reference')return['Removed','b-rem'];
  if(t==='Moved on listing')return['Moved','b-move'];
  if(t==='Partner project metadata changed')return['Metadata','b-meta'];
  return[esc(t),'b-neutral'];
}
function ago(iso){var ms=Date.now()-new Date(iso).getTime();var h=Math.floor(ms/36e5);
  if(h<1)return 'just now';if(h<24)return h+'h ago';return Math.floor(h/24)+'d ago'}

/* ---------- SVG charts ---------- */
function lineChart(series,w,h){ // series: [{label,color,pts:[[x,y],..]}], x indexes
  w=w||560;h=h||190;var pad={l:38,r:8,t:10,b:22};
  var maxY=0;series.forEach(function(s){s.pts.forEach(function(p){if(p[1]>maxY)maxY=p[1]})});
  if(!maxY)maxY=1;var n=series[0]?series[0].pts.length:0;if(!n)return '';
  var X=function(i){return pad.l+(w-pad.l-pad.r)*(n===1?0:i/(n-1))};
  var Y=function(v){return pad.t+(h-pad.t-pad.b)*(1-v/maxY)};
  var out='<svg class="chart" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid meet">';
  for(var g=0;g<=3;g++){var gy=pad.t+(h-pad.t-pad.b)*g/3;var gv=Math.round(maxY*(1-g/3));
    out+='<line x1="'+pad.l+'" y1="'+gy+'" x2="'+(w-pad.r)+'" y2="'+gy+'" stroke="#e8edf4" stroke-width="1"/><text x="'+(pad.l-5)+'" y="'+(gy+3.5)+'" font-size="9" fill="#94a3b8" text-anchor="end">'+fmt(gv)+'</text>';}
  series.forEach(function(s){
    var dattr='';s.pts.forEach(function(p,i){dattr+=(i?'L':'M')+X(i).toFixed(1)+','+Y(p[1]).toFixed(1)});
    out+='<path d="'+dattr+'" fill="none" stroke="'+s.color+'" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
    var last=s.pts[s.pts.length-1];
    if(last)out+='<circle cx="'+X(s.pts.length-1).toFixed(1)+'" cy="'+Y(last[1]).toFixed(1)+'" r="3.2" fill="'+s.color+'"/>';
  });
  return out+'</svg>';
}
function hbars(items,w,rowH,color){ // items:[{label,value,sub,href}]
  w=w||560;rowH=rowH||26;var h=items.length*rowH+6;var max=0;items.forEach(function(i){if(i.value>max)max=i.value});if(!max)max=1;
  var out='<svg class="chart" viewBox="0 0 '+w+' '+h+'" style="max-width:100%">';
  items.forEach(function(it,i){var y=i*rowH+3;var bw=(w-190)*(it.value/max);
    out+='<text x="0" y="'+(y+13)+'" font-size="11.5" fill="#334155">'+esc(it.label.length>22?it.label.slice(0,21)+'…':it.label)+'</text>';
    out+='<rect x="150" y="'+y+'" width="'+Math.max(2,bw).toFixed(1)+'" height="16" rx="4" fill="'+(color||'#0d9488')+'" opacity="'+(0.55+0.45*it.value/max)+'"/>';
    out+='<text x="'+(156+Math.max(2,bw))+'" y="'+(y+13)+'" font-size="11" font-weight="700" fill="#0f172a">'+fmt(it.value)+(it.sub?' <tspan fill="#94a3b8" font-weight="400">'+esc(it.sub)+'</tspan>':'')+'</text>';
  });
  return out+'</svg>';
}
function donut(items,w){ // items:[{label,value,color}]
  w=w||170;var cx=w/2,cy=w/2,r=62,ir=40,tot=0;items.forEach(function(i){tot+=i.value});if(!tot)return '';
  var a0=-Math.PI/2,out='<svg class="chart" viewBox="0 0 '+w+' '+w+'" style="max-width:'+w+'px">';
  items.forEach(function(it){var a1=a0+2*Math.PI*it.value/tot;
    var large=(a1-a0)>Math.PI?1:0;
    var x0=cx+r*Math.cos(a0),y0=cy+r*Math.sin(a0),x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1);
    var xi1=cx+ir*Math.cos(a1),yi1=cy+ir*Math.sin(a1),xi0=cx+ir*Math.cos(a0),yi0=cy+ir*Math.sin(a0);
    out+='<path d="M'+x0.toFixed(1)+','+y0.toFixed(1)+' A'+r+','+r+' 0 '+large+' 1 '+x1.toFixed(1)+','+y1.toFixed(1)+' L'+xi1.toFixed(1)+','+yi1.toFixed(1)+' A'+ir+','+ir+' 0 '+large+' 0 '+xi0.toFixed(1)+','+yi0.toFixed(1)+' Z" fill="'+it.color+'" stroke="#fff" stroke-width="2"/>';
    a0=a1;});
  out+='<text x="'+cx+'" y="'+(cy-2)+'" text-anchor="middle" font-size="22" font-weight="800" fill="#0f172a">'+fmt(tot)+'</text>';
  out+='<text x="'+cx+'" y="'+(cy+15)+'" text-anchor="middle" font-size="10" fill="#64748b">partners</text>';
  return out+'</svg>';
}

/* ---------- header/nav ---------- */
function renderShell(){
  var d=S.data;
  var nav=VIEWS.map(function(v){return '<a href="#/'+v[0]+'" data-v="'+v[0]+'">'+v[1]+'</a>'}).join('');
  document.title='Odoo Egypt market monitor';
  $('#app').innerHTML=
   '<header class="masthead"><div class="wrap">'
  +'<div class="brand">Digital Economics · Market intelligence</div>'
  +'<h1>The Egypt Odoo market</h1>'
  +'<div class="sub">Live public monitor of Odoo partners in Egypt, their referenced clients, and every listing change we detect.</div>'
  +'<div class="freshline">'
  +'<span><span class="dotlive"></span>Directory checked <b>'+fdate(d.directoryCheckedAt)+' Cairo</b> ('+ago(d.directoryCheckedAt)+')</span>'
  +'<span>Full profile scan <b>'+fdate(d.fullScanAt)+' Cairo</b></span>'
  +'<span>Tracking since <b>'+esc(d.trackingStart)+'</b></span>'
  +'</div>'
  +'<nav class="nav">'+nav+'</nav>'
  +'</div></header>'
  +'<main><div class="wrap" id="main"></div></main>'
  +'<footer><div class="wrap footer">'
  +'<div>Source: <a href="'+SRC+'">public Odoo partner directory - Egypt</a>. Near-live public monitoring, not an Odoo real-time feed. Observations of listing changes are not evidence of acquisitions, contract losses or commercial transfers.</div>'
  +'<div>Also published as an <a href="'+CANON+'">Instinct File</a> · <a href="'+SHEET+'">Underlying spreadsheet</a> (restricted) · <a href="https://github.com/Elhsn/odoo-egypt-market-monitor">Source mirror</a></div>'
  +'</div></footer>';
  $('.nav').addEventListener('click',function(e){var a=e.target.closest('a');if(a){S.view=a.dataset.v;}});
}
function setNav(){document.querySelectorAll('.nav a').forEach(function(a){a.classList.toggle('on',a.dataset.v===S.view)})}

/* ---------- OVERVIEW ---------- */
function vOverview(m){
  var d=S.data;
  var experts=d.partners.reduce(function(a,p){return a+(p.experts||0)},0);
  var tiers={Gold:0,Silver:0,Ready:0};d.partners.forEach(function(p){tiers[p.tier]=(tiers[p.tier]||0)+1});
  var recent=d.allChanges.slice(-6).reverse();
  var top=d.partners.slice().sort(function(a,b){return b.listed_refs-a.listed_refs}).slice(0,10);
  var sectors=Object.keys(d.sectors).map(function(k){return{label:k,value:d.sectors[k]}}).sort(function(a,b){return b.value-a.value});
  var topS=sectors.slice(0,8);var other=sectors.slice(8).reduce(function(a,s){return a+s.value},0);
  if(other)topS.push({label:'Other sectors',value:other});
  m.innerHTML=
   '<div class="kpis">'
  +'<div class="kpi acc"><div class="n">'+fmt(d.counts.partners)+'</div><div class="l">Partners</div><div class="d">'+tiers.Gold+' Gold · '+tiers.Silver+' Silver · '+tiers.Ready+' Ready</div></div>'
  +'<div class="kpi"><div class="n">'+fmt(d.counts.references)+'</div><div class="l">Client references</div><div class="d">Public listings under partners</div></div>'
  +'<div class="kpi"><div class="n">'+fmt(d.counts.clients)+'</div><div class="l">Unique client IDs</div><div class="d">IDs are not deduplicated legal entities</div></div>'
  +'<div class="kpi"><div class="n">'+fmt(d.counts.sectors)+'</div><div class="l">Industries</div><div class="d">As labelled by Odoo</div></div>'
  +'<div class="kpi"><div class="n">'+fmt(experts)+'</div><div class="l">Certified experts</div><div class="d">Across listed partners</div></div>'
  +'</div>'
  +'<div class="h2">Market map <small>Top partners by public client references</small></div>'
  +'<div class="card imgcard"><img src="chart.png" alt="Market chart of top Odoo partners in Egypt by referenced clients"><div class="cap">Generated at each published snapshot from live listing counts.</div></div>'
  +'<div class="grid2" style="margin-top:12px">'
  +'<div class="card pad"><div class="h2" style="margin-top:0">Top 10 partners</div>'+hbars(top.map(function(p){return{label:p.name,value:p.listed_refs}}))+'</div>'
  +'<div class="card pad"><div class="h2" style="margin-top:0">Client references by sector</div>'+hbars(topS.map(function(s){return{label:s.label,value:s.value}}),560,26,'#132c3a')+'</div>'
  +'</div>'
  +'<div class="h2">Latest activity <small><a href="#/activity">open full feed →</a></small></div>'
  +'<div class="card">'+recent.map(function(c){var t=dtype(c);return '<div class="earow" style="border-bottom:1px solid var(--line)"><span class="badge '+t[1]+'">'+t[0]+'</span><div class="bd"><span dir="auto"><b>'+esc(c[3]||c[5])+'</b>'+(c[1]==='Moved on listing'?' · '+esc(c[4])+' → '+esc(c[5]):(c[5]?' · under '+esc(c[5]):''))+'</span><div class="t">'+esc(c[0])+(c[7]?' · '+esc(c[7]):'')+'</div></div></div>'}).join('')+'</div>'
  +'<div class="h2">How to read this monitor</div>'
  +'<div class="notice"><b>What this is:</b> hourly directory checks plus full profile scans every three hours against the public Odoo Egypt partner listing.'
  +'<ul class="gaps" style="margin-top:8px">'
  +'<li><b>Observations, not contracts.</b> A client appearing or disappearing from a partner\'s public listing does not prove a deal was won, lost or moved.</li>'
  +'<li><b>Egypt is the partner market,</b> not a verified country for every client; Odoo IDs are not deduplicated legal entities.</li>'
  +'<li><b>Listing counters lag profile pages</b> on Odoo\'s side; every recorded change is verified against the live profile twice first.</li>'
  +'<li><b>History starts '+esc(d.trackingStart)+'.</b> Older sightings come from web.archive.org samples and are partial by nature.</li>'
  +'</ul></div>';
}

/* ---------- PARTNERS ---------- */
function vPartners(m){
  var d=S.data;
  var list=d.partners.filter(function(p){
    return (S.pTier==='All'||p.tier===S.pTier)&&p.name.toLowerCase().includes(S.pQ);
  });
  if(S.pSort==='refs')list.sort(function(a,b){return b.listed_refs-a.listed_refs});
  else if(S.pSort==='users')list.sort(function(a,b){return (b.avg_users||0)-(a.avg_users||0)});
  else if(S.pSort==='experts')list.sort(function(a,b){return (b.experts||0)-(a.experts||0)});
  else list.sort(function(a,b){return a.name.localeCompare(b.name)});
  var tiers=['All','Gold','Silver','Ready'];
  m.innerHTML=
   '<div class="filterbar"><div class="row">'
  +'<div class="search">'+searchIcon()+'<input id="pq" placeholder="Search '+d.partners.length+' partners" value="'+esc(S.pQ)+'"></div>'
  +'<div class="chips">'+tiers.map(function(t){return '<button class="chip'+(S.pTier===t?' on':'')+'" data-t="'+t+'">'+t+'</button>'}).join('')+'</div>'
  +'<select class="sel" id="ps"><option value="refs">Most references</option><option value="users">Most avg users</option><option value="experts">Most experts</option><option value="name">Name A-Z</option></select>'
  +'<span class="count-note">'+list.length+' shown</span>'
  +'</div></div>'
  +'<div class="plist" style="margin-top:14px">'
  +list.map(function(p){
    return '<div class="card pcard"><div class="top"><div class="nm" dir="auto">'+esc(p.name)+'</div>'+tierB(p.tier)+'</div>'
    +'<div class="stats"><span><b>'+fmt(p.listed_refs)+'</b>references</span><span><b>'+fmt(p.avg_users)+'</b>avg users</span><span><b>'+fmt(p.experts)+'</b>experts</span><span><b>'+fmt(p.large_users)+'</b>largest</span></div>'
    +'<a href="'+esc(p.url)+'" style="font-size:12.5px;font-weight:600">Odoo profile '+extIcon()+'</a></div>';
  }).join('')+'</div>'
  +(list.length?'':'<div class="card empty">No partners match.</div>')
  +'<div class="h2">No longer listed <small>'+d.retiredPartners.length+' partners observed leaving the directory</small></div>'
  +'<div class="card">'+d.retiredPartners.map(function(p){
    return '<div class="earow" style="border-bottom:1px solid var(--line)"><span class="badge b-neutral">'+esc(p.tier)+'</span><div class="bd"><span dir="auto"><b>'+esc(p.name)+'</b></span><div class="t">was '+fmt(p.listed_refs)+' references · left directory '+fdate(p.removedAt)+' · <a href="'+esc(p.url)+'">profile</a></div></div></div>'}).join('')+'</div>';
  $('#ps').value=S.pSort;
  $('#pq').addEventListener('input',function(e){S.pQ=e.target.value.toLowerCase();vPartners(m)});
  $('#ps').addEventListener('change',function(e){S.pSort=e.target.value;vPartners(m)});
  m.querySelectorAll('.chip').forEach(function(b){b.addEventListener('click',function(){S.pTier=b.dataset.t;vPartners(m)})});
}

/* ---------- CLIENTS ---------- */
function vClients(m){
  var d=S.data;
  var today=new Date().toLocaleDateString('sv-SE',{timeZone:'Africa/Cairo'});
  var weekAgo=new Date(Date.now()-6*864e5).toLocaleDateString('sv-SE',{timeZone:'Africa/Cairo'});
  var list=d.references.filter(function(r){
    if(S.cTier!=='All'&&r.tier!==S.cTier)return false;
    if(S.cInd&&r.industry!==S.cInd)return false;
    if(S.cNew&&!(r.firstSeen>=weekAgo&&r.firstSeen>d.trackingStart))return false;
    if(S.cQ){var hay=(r.name+' '+r.partner+' '+r.industry+' '+r.id).toLowerCase();if(!hay.includes(S.cQ))return false;}
    return true;
  });
  if(S.cSort==='first')list.sort(function(a,b){return a.firstSeen<b.firstSeen?1:-1});
  else if(S.cSort==='last')list.sort(function(a,b){return a.lastSeen<b.lastSeen?1:-1});
  else list.sort(function(a,b){return a.name.localeCompare(b.name)});
  var shown=list.slice(0,S.cShown);
  var inds=Object.keys(d.sectors).sort();
  m.innerHTML=
   '<div class="filterbar"><div class="row">'
  +'<div class="search">'+searchIcon()+'<input id="cq" placeholder="Search '+fmt(d.references.length)+' client references: name, partner, industry, ID" value="'+esc(S.cQ)+'"></div>'
  +'</div><div class="row" style="margin-top:8px">'
  +'<select class="sel" id="ci"><option value="">All industries</option>'+inds.map(function(i){return '<option'+(S.cInd===i?' selected':'')+'>'+esc(i)+'</option>'}).join('')+'</select>'
  +'<select class="sel" id="ct"><option>All</option><option>Gold</option><option>Silver</option><option>Ready</option></select>'
  +'<select class="sel" id="cs"><option value="name">Name A-Z</option><option value="first">Newest first</option><option value="last">Recently seen</option></select>'
  +'<button class="chip'+(S.cNew?' on acc':'')+'" id="cn">New this week</button>'
  +'<span class="count-note">'+fmt(list.length)+' matches</span>'
  +'</div></div>'
  +'<div class="clist" style="margin-top:14px">'
  +shown.map(function(r){
    var isNew=r.firstSeen>=weekAgo&&r.firstSeen>d.trackingStart;
    return '<div class="card crow"><div class="main"><div class="nm" dir="auto">'+esc(r.name)+(isNew?' <span class="new-dot" title="First observed within 7 days">● NEW</span>':'')+'</div>'
    +'<div class="meta"><span class="tag" dir="auto">'+esc(r.industry)+'</span><span>under <b dir="auto">'+esc(r.partner)+'</b></span><span>'+tierB(r.tier)+'</span>'+(r.users!=='Unavailable'?'<span>'+esc(r.users)+' users</span>':'')+'</div>'
    +'<div class="meta"><span>first seen '+esc(r.firstSeen)+'</span><span>last seen '+esc(r.lastSeen)+'</span><span>ID '+esc(r.id)+'</span></div></div>'
    +'<a href="'+esc(r.url)+'" title="Odoo listing">'+extIcon()+'</a></div>';
  }).join('')+'</div>'
  +(list.length?(list.length>S.cShown?'<button class="showmore" id="more">Show more ('+fmt(list.length-S.cShown)+' remaining)</button>':''):'<div class="card empty">No clients match these filters.</div>');
  $('#cs').value=S.cSort;$('#ct').value=S.cTier;
  $('#cq').addEventListener('input',function(e){S.cQ=e.target.value.toLowerCase();S.cShown=60;vClients(m)});
  $('#ci').addEventListener('change',function(e){S.cInd=e.target.value;S.cShown=60;vClients(m)});
  $('#ct').addEventListener('change',function(e){S.cTier=e.target.value;S.cShown=60;vClients(m)});
  $('#cs').addEventListener('change',function(e){S.cSort=e.target.value;vClients(m)});
  $('#cn').addEventListener('click',function(){S.cNew=!S.cNew;S.cShown=60;vClients(m)});
  var mo=$('#more');if(mo)mo.addEventListener('click',function(){S.cShown+=80;vClients(m)});
}

/* ---------- ACTIVITY ---------- */
function vActivity(m){
  var d=S.data;
  var today=new Date().toLocaleDateString('sv-SE',{timeZone:'Africa/Cairo'});
  var start=S.aPeriod==='all'?d.trackingStart:(S.aPeriod==='custom'?(S.aFrom||d.trackingStart):new Date(Date.now()-(+S.aPeriod-1)*864e5).toLocaleDateString('sv-SE',{timeZone:'Africa/Cairo'}));
  var end=S.aPeriod==='custom'?(S.aTo||today):today;
  var evs=d.allChanges.filter(function(c){return c[0]>=start&&c[0]<=end});
  if(S.aType!=='All')evs=evs.filter(function(c){return dtype(c)[0]===S.aType});
  evs=evs.slice().reverse();
  var types=['All','New client','Added','Removed','Moved','Metadata'];
  var groups={};evs.forEach(function(c){(groups[c[0]]=groups[c[0]]||[]).push(c)});
  var days=Object.keys(groups).sort().reverse();
  m.innerHTML=
   '<div class="filterbar"><div class="row">'
  +'<div class="chips">'+types.map(function(t){return '<button class="chip'+(S.aType===t?' on':'')+'" data-t="'+t+'">'+t+'</button>'}).join('')+'</div>'
  +'</div><div class="row" style="margin-top:8px">'
  +'<div class="chips">'+[['0','Today'],['7','7 days'],['30','30 days'],['all','All history'],['custom','Custom']].map(function(p){return '<button class="chip'+(S.aPeriod===p[0]?' on acc':'')+'" data-p="'+p[0]+'">'+p[1]+'</button>'}).join('')+'</div>'
  +(S.aPeriod==='custom'?'<input type="date" class="sel" id="af" value="'+esc(S.aFrom)+'"><input type="date" class="sel" id="at" value="'+esc(S.aTo)+'">':'')
  +'<span class="count-note">'+fmt(evs.length)+' events · '+esc(start)+' → '+esc(end)+'</span>'
  +'</div></div>'
  +'<div style="margin-top:14px">'
  +(days.length?days.map(function(day){
    return '<div class="daygroup"><div class="dayhead">'+esc(day)+' · '+groups[day].length+' event'+(groups[day].length>1?'s':'')+'</div><div class="card">'
    +groups[day].map(function(c){var t=dtype(c);
      var body;
      if(c[1]==='Moved on listing')body='<span dir="auto"><b>'+esc(c[3])+'</b> · '+esc(c[4])+' → <b>'+esc(c[5])+'</b></span>';
      else if(c[1]==='Partner project metadata changed')body='<span dir="auto"><b>'+esc(c[3])+'</b> project metrics changed</span><div class="t" dir="auto">'+esc(c[4])+' → '+esc(c[5])+'</div>';
      else body='<span dir="auto"><b>'+esc(c[3])+'</b>'+(c[5]?' · under '+esc(c[5]):'')+'</span>';
      return '<div class="earow" style="border-bottom:1px solid var(--line)"><span class="badge '+t[1]+'">'+t[0]+'</span><div class="bd">'+body+'<div class="t" dir="auto">'+(c[7]?esc(c[7]):'')+(c[6]?' · <a href="'+esc(c[6])+'">Odoo</a>':'')+'</div></div></div>'}).join('')
    +'</div></div>'}).join(''):'<div class="card empty">No events in this range.</div>')
  +'</div>';
  m.querySelectorAll('[data-t]').forEach(function(b){b.addEventListener('click',function(){S.aType=b.dataset.t;vActivity(m)})});
  m.querySelectorAll('[data-p]').forEach(function(b){b.addEventListener('click',function(){S.aPeriod=b.dataset.p;vActivity(m)})});
  var af=$('#af'),at=$('#at');if(af)af.addEventListener('change',function(){S.aFrom=af.value;vActivity(m)});if(at)at.addEventListener('change',function(){S.aTo=at.value;vActivity(m)});
}

/* ---------- ALERTS ---------- */
function vAlerts(m){
  var d=S.data;
  var list=d.notifications.filter(function(n){return !S.nQ||(n.title+' '+n.detail).toLowerCase().includes(S.nQ)}).slice().reverse();
  m.innerHTML=
   '<div class="filterbar"><div class="row"><div class="search">'+searchIcon()+'<input id="nq" placeholder="Search '+list.length+' alerts" value="'+esc(S.nQ)+'"></div><span class="count-note">'+list.length+' alerts</span></div></div>'
  +'<div style="margin-top:14px">'
  +list.map(function(n){
    return '<div class="card acard"><div class="dt">Detected '+fdate(n.detectedAt)+' Cairo</div><div class="ti" dir="auto">'+esc(n.title)+'</div><div class="de" dir="auto">'+esc(n.detail)+'</div>'
    +(n.caveat?'<div class="st" dir="auto">'+esc(n.caveat)+'</div>':'')
    +(n.status?'<div class="de" style="margin-top:6px;color:var(--mut)" dir="auto">'+esc(n.status)+'</div>':'')
    +'</div>'}).join('')
  +(list.length?'':'<div class="card empty">No alerts match.</div>')+'</div>';
  $('#nq').addEventListener('input',function(e){S.nQ=e.target.value.toLowerCase();vAlerts(m)});
}

/* ---------- TRENDS ---------- */
function vTrends(m){
  var d=S.data;
  var runs=d.runs.filter(function(r){return r[3]==='Complete'&&typeof r[4]==='number'});
  // daily last point
  var byDay={};runs.forEach(function(r){var day=(r[2]||r[0]).slice(0,10);byDay[day]=r});
  var days=Object.keys(byDay).sort();
  var pPts=days.map(function(dy,i){return[i,byDay[dy][4]]});
  var rPts=days.map(function(dy,i){return[i,byDay[dy][5]]});
  // cumulative client IDs
  var firsts={};d.history.forEach(function(h){firsts[h[1]]=h[4]});
  var perDay={};Object.keys(firsts).forEach(function(id){perDay[firsts[id]]=(perDay[firsts[id]]||0)+1});
  var cum=0;var cumPts=days.map(function(dy,i){cum+=perDay[dy]||0;return[i,cum]});
  // adds/removes last 30d
  var last30=days.slice(-30);
  var ar=last30.map(function(dy){var a=0,rm=0;d.allChanges.forEach(function(c){if(c[0]===dy){if(c[1]==='Added reference')a++;if(c[1]==='Removed reference')rm++}});return{day:dy,a:a,r:rm}});
  var maxAR=1;ar.forEach(function(x){maxAR=Math.max(maxAR,x.a,x.r)});
  var bw=560/last30.length;
  var arSvg='<svg class="chart" viewBox="0 0 560 170">';
  for(var g=0;g<=3;g++){var gy=10+130*g/3;arSvg+='<line x1="30" y1="'+gy+'" x2="556" y2="'+gy+'" stroke="#e8edf4"/><text x="26" y="'+(gy+3)+'" font-size="9" fill="#94a3b8" text-anchor="end">'+Math.round(maxAR*(1-g/3))+'</text>'}
  ar.forEach(function(x,i){var X=34+i*bw;var ah=130*x.a/maxAR;var rh=130*x.r/maxAR;
    arSvg+='<rect x="'+X.toFixed(1)+'" y="'+(140-ah)+'" width="'+Math.max(2,bw*0.36).toFixed(1)+'" height="'+Math.max(0.5,ah)+'" fill="#15803d" rx="2"/>';
    arSvg+='<rect x="'+(X+bw*0.42).toFixed(1)+'" y="'+(140-rh)+'" width="'+Math.max(2,bw*0.36).toFixed(1)+'" height="'+Math.max(0.5,rh)+'" fill="#b91c1c" rx="2"/>';
    if(i%5===0)arSvg+='<text x="'+X.toFixed(1)+'" y="162" font-size="8.5" fill="#94a3b8">'+x.day.slice(5)+'</text>';
  });
  arSvg+='</svg>';
  var tiers={Gold:0,Silver:0,Ready:0};d.partners.forEach(function(p){tiers[p.tier]=(tiers[p.tier]||0)+1});
  m.innerHTML=
   '<div class="h2" style="margin-top:0">Market size over time <small>daily snapshot from completed checks</small></div>'
  +'<div class="card pad">'+lineChart([{label:'Partners',color:'#0d9488',pts:pPts},{label:'Client references',color:'#132c3a',pts:rPts}])
  +'<div class="legend"><span><i style="background:#0d9488"></i>Partners</span><span><i style="background:#132c3a"></i>Client references</span><span style="margin-left:auto">'+esc(days[0]||'')+' → '+esc(days[days.length-1]||'')+'</span></div></div>'
  +'<div class="h2">Observed client IDs, cumulative</div>'
  +'<div class="card pad">'+lineChart([{label:'Client IDs',color:'#7c3aed',pts:cumPts}])+'<div class="legend"><span><i style="background:#7c3aed"></i>Cumulative unique client IDs ever observed</span></div></div>'
  +'<div class="h2">Adds and removals, last 30 days</div>'
  +'<div class="card pad">'+arSvg+'<div class="legend"><span><i style="background:#15803d"></i>Added references</span><span><i style="background:#b91c1c"></i>Removed references</span></div></div>'
  +'<div class="grid2">'
  +'<div class="card pad"><div class="h2" style="margin-top:0">Partner tier mix</div><div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">'+donut([{label:'Gold',value:tiers.Gold,color:'#d97706'},{label:'Silver',value:tiers.Silver,color:'#64748b'},{label:'Ready',value:tiers.Ready,color:'#0284c7'}])
  +'<div class="legend" style="flex-direction:column;gap:6px"><span><i style="background:#d97706"></i>Gold · '+tiers.Gold+'</span><span><i style="background:#64748b"></i>Silver · '+tiers.Silver+'</span><span><i style="background:#0284c7"></i>Ready · '+tiers.Ready+'</span></div></div></div>'
  +'<div class="card pad"><div class="h2" style="margin-top:0">Runs completed</div><div style="font-size:32px;font-weight:800">'+fmt(runs.length)+'</div><div style="font-size:12.5px;color:var(--mut)">completed monitoring checks since '+esc(d.trackingStart)+'</div></div>'
  +'</div>';
}

/* ---------- ARCHIVE ---------- */
function vArchive(m){
  var d=S.data;var cov=d.archiveCoverage||{};
  var list=d.archive.filter(function(a){return !S.arQ||(a.partner+' '+a.client).toLowerCase().includes(S.arQ)});
  var shown=list.slice(0,80);
  m.innerHTML=
   '<div class="h2" style="margin-top:0">Historical archive <small>web.archive.org sightings before live tracking</small></div>'
  +'<div class="notice">Archive coverage is partial: '+fmt(cov.sightings||0)+' sightings across '+fmt(cov.pairs||0)+' partner-client pairs, '+esc(cov.start||'')+' → '+esc(cov.end||'')+'. Only '+fmt(cov.partnersWithUsableSnapshots||0)+' partners have usable snapshots, so absence here proves nothing.</div>'
  +'<div class="filterbar" style="margin-top:12px"><div class="row"><div class="search">'+searchIcon()+'<input id="arq" placeholder="Search archive: partner or client" value="'+esc(S.arQ)+'"></div><span class="count-note">'+fmt(list.length)+' sightings</span></div></div>'
  +'<div class="clist" style="margin-top:14px">'
  +shown.map(function(a){
    return '<div class="card crow"><div class="main"><div class="nm" dir="auto">'+esc(a.client)+'</div><div class="meta"><span>under <b dir="auto">'+esc(a.partner)+'</b></span><span>snapshot '+esc(a.snapshot)+'</span></div></div><a href="'+esc(a.source)+'" title="Archived page">'+extIcon()+'</a></div>'}).join('')
  +'</div>'+(list.length>80?'<div class="count-note" style="margin-top:10px">Showing first 80.</div>':'')+(list.length?'':'<div class="card empty">No archive sightings match.</div>');
  $('#arq').addEventListener('input',function(e){S.arQ=e.target.value.toLowerCase();vArchive(m)});
}

/* ---------- router ---------- */
function route(){
  var h=location.hash.replace(/^#\/?/,'')||'overview';
  if(!VIEWS.some(function(v){return v[0]===h}))h='overview';
  S.view=h;setNav();
  var m=$('#main');
  window.scrollTo(0,0);
  ({overview:vOverview,partners:vPartners,clients:vClients,activity:vActivity,alerts:vAlerts,trends:vTrends,archive:vArchive})[h](m);
}
fetch('data.json').then(function(r){if(!r.ok)throw new Error('data.json HTTP '+r.status);return r.json()}).then(function(d){
  S.data=d;
  S.earliest={};d.history.forEach(function(hh){if(!S.earliest[hh[1]]||hh[4]<S.earliest[hh[1]])S.earliest[hh[1]]=hh[4]});
  renderShell();route();window.addEventListener('hashchange',route);
}).catch(function(e){
  $('#app').innerHTML='<div class="wrap"><div class="errbox">Could not load dashboard data ('+esc(e.message)+'). The snapshot may still be publishing - reload in a minute.</div></div>';
});
})();
