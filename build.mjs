/* KOVA EPK — static build. No dependencies. */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
const site = JSON.parse(readFileSync('data/site.json','utf8'));
const mus  = JSON.parse(readFileSync('data/music.json','utf8'));
const dts  = JSON.parse(readFileSync('data/dates.json','utf8'));

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* every track must actually exist, or the player silently dies */
for (const t of mus.tracks) {
  try { statSync(t.src) } catch { console.error('  ! missing audio:', t.src); process.exit(1) }
}

const fmtDate = iso => {
  const d = new Date(iso+'T00:00:00');
  return { m: d.toLocaleDateString('en-US',{month:'short'}).toUpperCase(), day: d.getDate(),
           full: d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}) };
};
const upcoming = dts.dates.filter(d=>d.status!=='past').sort((a,b)=>a.d.localeCompare(b.d));
const past     = dts.dates.filter(d=>d.status==='past').sort((a,b)=>b.d.localeCompare(a.d));

const row = d => {
  const f = fmtDate(d.d);
  const label = d.status==='tickets'?'Tickets':d.status==='soldout'?'Sold out':'Past';
  const el = d.status==='tickets'
    ? `<a class="st tickets" href="#booking">${label}</a>`
    : `<span class="st ${d.status}">${label}</span>`;
  return `<li class="date${d.status==='past'?' is-past':''}" data-when="${d.status==='past'?'past':'upcoming'}">
        <span class="dt"><time datetime="${d.d}">${f.m} ${f.day}</time></span>
        <span><span class="ci">${esc(d.city)}</span><br><span class="ve">${esc(d.venue)} &middot; ${esc(d.bill)}</span></span>
        ${el}
      </li>`;
};
const DATES = [...upcoming.map(row), ...past.map(row)].join('\n      ');

const TRACKS = mus.tracks.map((t,i)=>`
        <li data-i="${i}" ${i===0?'aria-current="true"':''}>
          <span class="n">${i+1}</span>
          <span><span class="ti">${esc(t.title)}</span><br><span class="re">${esc(t.release)} &middot; ${t.year}</span></span>
          <span class="du" data-dur="${i}">--:--</span>
        </li>`).join('');

const KIT = [
  { im:'press-1', h:'Press photo, live', p:'2400px, colour. Credit: photographer name.', f:'assets/img/press-1.webp' },
  { im:'press-2', h:'Press photo, crowd', p:'2400px, colour. Credit: photographer name.', f:'assets/img/press-2.webp' },
  { im:'press-3', h:'Press photo, stage', p:'2400px, colour. Credit: photographer name.', f:'assets/img/press-3.webp' },
].map(k=>`
      <article class="kitcard rv">
        <div class="im"><img src="assets/img/${k.im}.webp" alt="${esc(k.h)}" loading="lazy" width="900" height="675"></div>
        <div class="bd"><h3>${esc(k.h)}</h3><p>${esc(k.p)}</p>
          <a class="dl" href="${k.f}" download>Download</a></div>
      </article>`).join('');

const SOCIALS = site.socials.map(s=>`<p>${esc(s.label)} &middot; ${esc(s.handle)}</p>`).join('');

const d = site.demo||{};
const DEMOBAR = d.show?`<div class="demo-bar" role="note"><p>${esc(d.text)}</p><span class="sep">&middot;</span>
  <a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">${esc(d.linkText)}</a></div>`:'';
const DEMOFOOT = d.show?`<div class="demo-foot">${esc(d.text)}
  <a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">${esc(d.linkText)}</a></div>`:'';

const JSONLD = JSON.stringify({'@context':'https://schema.org','@type':'MusicGroup',
  name:site.artist, description:site.bio_short, genre:site.genre,
  email:site.booking.email, foundingLocation:site.city,
  event: upcoming.map(x=>({'@type':'MusicEvent',name:`${site.artist} at ${x.venue}`,
    startDate:x.d, location:{'@type':'Place',name:x.venue,address:x.city}}))});

const SCRIPT = `<script>
var TRACKS=${JSON.stringify(mus.tracks.map(t=>({t:t.title,r:t.release,y:t.year,art:'assets/img/'+t.art+'.webp',src:t.src})))};
document.getElementById('yr').textContent=new Date().getFullYear();
var nav=document.getElementById('nav');
addEventListener('scroll',function(){nav.classList.toggle('stuck',scrollY>12)},{passive:true});
if('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches){
  var io=new IntersectionObserver(function(es){es.forEach(function(e){
    if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.05});
  document.querySelectorAll('.rv').forEach(function(el){io.observe(el)});
}else{document.querySelectorAll('.rv').forEach(function(el){el.classList.add('in')})}

/* ---------- player ---------- */
var au=new Audio(), cur=0, playing=false;
au.preload='metadata';
var $=function(s){return document.querySelector(s)};
var elArt=$('#nowArt'), elTitle=$('#nowTitle'), elRel=$('#nowRel'),
    btn=$('#playBtn'), seek=$('#seek'), fill=$('#seekFill'), time=$('#time'),
    list=document.querySelectorAll('.tracks li');

function mmss(s){ if(!isFinite(s)) return '0:00';
  var m=Math.floor(s/60), r=Math.floor(s%60); return m+':'+(r<10?'0':'')+r }
function load(i,auto){
  cur=(i+TRACKS.length)%TRACKS.length;
  var t=TRACKS[cur];
  au.src=t.src; elArt.src=t.art; elArt.alt=t.t+' artwork';
  elTitle.textContent=t.t; elRel.textContent=t.r+' · '+t.y;
  list.forEach(function(li,n){ li.setAttribute('aria-current',String(n===cur)) });
  fill.style.width='0%'; time.textContent='0:00 / 0:00';
  /* calling play() straight after setting src aborts on the pending load,
     so wait until the browser can actually start */
  if(auto){
    if(au.readyState>=3){ play() }
    else { au.addEventListener('canplay',function once(){ au.removeEventListener('canplay',once); play() }) }
  }
}
function play(){ au.play().then(function(){ playing=true; btn.textContent='❚❚'; btn.setAttribute('aria-label','Pause') })
  .catch(function(){ playing=false; btn.textContent='\u25B6'; btn.setAttribute('aria-label','Play') }) }
function pause(){ au.pause(); playing=false; btn.textContent='▶'; btn.setAttribute('aria-label','Play') }
btn.addEventListener('click',function(){ playing?pause():play() });
list.forEach(function(li){ li.addEventListener('click',function(){ load(+li.dataset.i,true) }) });
au.addEventListener('timeupdate',function(){
  if(!au.duration) return;
  fill.style.width=(au.currentTime/au.duration*100)+'%';
  time.textContent=mmss(au.currentTime)+' / '+mmss(au.duration);
});
au.addEventListener('ended',function(){ load(cur+1,true) });
seek.addEventListener('click',function(e){
  if(!au.duration) return;
  var r=seek.getBoundingClientRect();
  au.currentTime=Math.min(au.duration,Math.max(0,(e.clientX-r.left)/r.width*au.duration));
});
/* durations for the list, read from metadata without downloading the whole file */
TRACKS.forEach(function(t,i){
  var probe=new Audio(); probe.preload='metadata'; probe.src=t.src;
  probe.addEventListener('loadedmetadata',function(){
    var el=document.querySelector('[data-dur="'+i+'"]'); if(el) el.textContent=mmss(probe.duration);
  });
});
load(0,false);

/* ---------- dates toggle ---------- */
var dbtns=document.querySelectorAll('.togg button'), rows=document.querySelectorAll('.date');
function showWhen(w){
  rows.forEach(function(r){ r.hidden = r.dataset.when!==w });
  var n=[].slice.call(rows).filter(function(r){return !r.hidden}).length;
  document.getElementById('dateCount').textContent = n + (n===1?' date':' dates');
}
dbtns.forEach(function(b){ b.addEventListener('click',function(){
  dbtns.forEach(function(o){o.setAttribute('aria-pressed',String(o===b))});
  showWhen(b.dataset.w);
})});
showWhen('upcoming');

/* ---------- mailing list ---------- */
$('#mail').addEventListener('submit',function(e){
  e.preventDefault();
  var inp=$('#mailInput'), v=inp.value.trim(), old=$('.sigok');
  if(old) old.remove();
  inp.classList.remove('err');
  if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(v)){ inp.classList.add('err'); inp.focus(); return }
  var p=document.createElement('p'); p.className='sigok';
  p.textContent='Thanks. In production this would add '+v+' to the mailing list. Nothing was sent from this demo.';
  this.after(p); inp.value='';
});
</script>`;

const vars = {
  ARTIST:esc(site.artist), TAGLINE:esc(site.tagline), CITY:esc(site.city), GENRE:esc(site.genre),
  BIO_SHORT:esc(site.bio_short), BIO_LONG:esc(site.bio_long),
  BOOK_EMAIL:esc(site.booking.email), BOOK_PHONE:esc(site.booking.phone),
  BOOK_PHONE_RAW:site.booking.phone.replace(/[^\d+]/g,''), PRESS_EMAIL:esc(site.press.email),
  TRACKS, DATES, KIT, SOCIALS, DEMOBAR, DEMOFOOT, SCRIPT, JSONLD,
  N_UPCOMING: upcoming.length, N_TRACKS: mus.tracks.length,
  FIRST_ART: 'assets/img/'+mus.tracks[0].art+'.webp'
};
const out = readFileSync('src/index.template.html','utf8')
  .replace(/\{\{(\w+)\}\}/g,(m,k)=> k in vars ? vars[k] : (console.warn('  ! unknown token',k),m));
writeFileSync('index.html', out);
console.log('  built index.html');
console.log(`  ${mus.tracks.length} tracks, ${upcoming.length} upcoming and ${past.length} past dates`);
