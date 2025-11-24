// Multi-page navigation, scoring (category-based), theme, local save, safe copy
const pages = Array.from(document.querySelectorAll('.page'));
const totalSteps = pages.length;
const progressBar = document.getElementById('progressBar');

function activeIndex(){ return pages.findIndex(p => p.classList.contains('active')); }
function showPage(idx){ pages.forEach(p=>p.classList.remove('active')); pages[idx].classList.add('active'); updateProgress(idx); }
function updateProgress(idx){ const percent = (idx/(totalSteps-1))*100; progressBar.style.width = percent + '%'; }

document.querySelectorAll('[data-next]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const idx = activeIndex(); const current = pages[idx];
    // basic required validation: check first required input on page
    const req = current.querySelector('input[required]');
    if(req){
      const chosen = current.querySelector('input[name="'+req.name+'"]:checked');
      if(!chosen){ alert('Please answer the required question on this page.'); return; }
    }
    const next = Math.min(idx+1, totalSteps-1);
    showPage(next);
  });
});
document.querySelectorAll('[data-prev]').forEach(btn=> btn.addEventListener('click', ()=> { showPage(Math.max(activeIndex()-1,0)); }));

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
if(localStorage.getItem('theme')==='light') document.body.classList.add('light');
themeToggle.addEventListener('click', ()=>{
  document.body.classList.toggle('light');
  localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
});

// Save progress
document.getElementById('saveLocal1').addEventListener('click', ()=>{
  const state = gatherAnswers(); localStorage.setItem('quizProgress', JSON.stringify(state)); alert('Progress saved locally.');
});

// Gather answers
function gatherAnswers(){
  const data = {};
  document.querySelectorAll('input[type="radio"]:checked').forEach(r => data[r.name]=r.value);
  return data;
}

// Scoring helpers (0-25 each)
function scoreCategoryDaily(data){
  const m = {'energized':25,'okay':18,'groggy':8,'exhausted':2};
  const s = {'never':25,'occasionally':18,'frequently':8,'always':2};
  return Math.round(((m[data.mornFeel]||0)*0.5)+((s[data.daySleepy]||0)*0.5));
}
function scoreCategoryLifestyle(data){
  const maps = {screens:{no:25,sometimes:18,often:10,always:4}, exercise:{'0':4,'1-2':12,'3-4':20,'5+':25}, rely:{never:25,sometimes:16,daily:8,multiple:2}};
  return Math.round(( (maps.screens[data.screens]||0)*0.4 ) + ( (maps.exercise[data.exercise]||0)*0.35 ) + ( (maps.rely[data.rely]||0)*0.25 ));
}
function scoreCategoryMental(data){
  const s = {low:25,medium:18,high:8,veryHigh:2}; const w = {never:25,sometimes:18,often:8,always:2};
  return Math.round( ( (s[data.stress]||0)*0.5 ) + ( (w[data.worry]||0)*0.5 ) );
}
function scoreCategoryGoals(data){
  const g = {fall:20,wake:22,stay:20,align:18}; const w = {'5-7':22,'7-9':20,'9-12':10,'inconsistent':4};
  return Math.round( ( (g[data.goal]||0)*0.5 ) + ( (w[data.freeWake]||0)*0.5 ) );
}

function determineCircadian(data){
  if(data.alertness==='morning' || data.freeWake==='5-7') return 'Morning (Lion)';
  if(data.alertness==='evening' || data.freeWake==='9-12') return 'Night Owl (Wolf)';
  if(data.alertness==='midday' || data.freeWake==='7-9') return 'Intermediate (Bear)';
  return 'Irregular (Dolphin)';
}

function personaFromScore(score){
  if(score>=80) return {title:'The Consistent Achiever',desc:'You keep steady habits and get reliable sleep. Optimize evenings for even better mornings.'};
  if(score>=60) return {title:'The Improving Planner',desc:'You have many good habits but a few friction points. Target screens and stress for gains.'};
  if(score>=40) return {title:'The Night Strategist',desc:'You show misalignment: high evening alertness or irregular wake times. Focus on circadian cues.'};
  return {title:'The Light Sleeper',desc:'Low score and inconsistent patterns — prioritize sleep hygiene and consider professional help if persistent.'};
}

// Calculate and show results
document.getElementById('calculateBtn').addEventListener('click', ()=>{
  const data = gatherAnswers();
  const daily = scoreCategoryDaily(data);
  const lifestyle = scoreCategoryLifestyle(data);
  const mental = scoreCategoryMental(data);
  const goals = scoreCategoryGoals(data);
  const total = Math.round((daily + lifestyle + mental + goals)/4);
  const circ = determineCircadian(data);
  const persona = personaFromScore(total);
  const summaryEl = document.getElementById('summary');
  summaryEl.innerHTML = `
    <div><strong>💤 Sleep Score:</strong> ${total}/100</div>
    <div style="margin-top:8px"><strong>⏰ Circadian Rhythm:</strong> ${circ}</div>
    <div style="margin-top:8px"><strong>🧑‍💤 Persona:</strong> ${persona.title}</div>
    <div class="tips"><strong>About your persona:</strong><div style="margin-top:6px">${persona.desc}</div>
      <div style="margin-top:8px"><strong>Category breakdown (0-25):</strong>
        <ul style="margin:8px 0 0 18px;padding:0">
          <li>Daily experience: ${daily}</li>
          <li>Lifestyle: ${lifestyle}</li>
          <li>Mental state: ${mental}</li>
          <li>Sleep goals: ${goals}</li>
        </ul>
      </div>
    </div>
  `;
  // save locally
  const result = {score:total,circadian:circ,persona:persona.title,details:{daily,lifestyle,mental,goals},answers:data,generatedAt:new Date().toISOString()};
  localStorage.setItem('lastSleepResult', JSON.stringify(result));
  // prepare share text
  window._shareText = `Sleep Score: ${total}/100 — ${persona.title} — ${circ} — ${persona.desc}`;
  // show result page
  showPage(pages.findIndex(p=>p.id==='results'));
});

// Safe copy with fallback
async function safeCopy(text){
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
      return {ok:true,method:'clipboard'};
    }
  }catch(e){ console.warn('Clipboard failed',e); }
  try{
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position='fixed'; ta.style.left='-9999px'; document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand && document.execCommand('copy');
    document.body.removeChild(ta);
    if(ok) return {ok:true,method:'execCommand'};
  }catch(e){ console.warn('execCommand failed',e); }
  try{ window.prompt('Copy the text below (Ctrl/Cmd+C):', text); }catch(e){}
  return {ok:false,method:'prompt'};
}

document.getElementById('copyBtn').addEventListener('click', async ()=>{
  const txt = window._shareText || 'My sleep results';
  const res = await safeCopy(txt);
  if(res.ok) alert('Summary copied to clipboard.');
  else alert('Could not copy automatically — a prompt opened so you can copy manually.');
});

document.getElementById('tweetBtn').addEventListener('click', ()=>{
  const txt = encodeURIComponent(window._shareText || 'My sleep results'); const url = `https://twitter.com/intent/tweet?text=${txt}`; window.open(url,'_blank');
});

document.getElementById('restartBtn').addEventListener('click', ()=>{
  document.querySelectorAll('input[type="radio"]').forEach(r=>r.checked=false); showPage(0); updateProgress(0);
});

// Restore progress on load
(function restore(){
  const saved = JSON.parse(localStorage.getItem('quizProgress')||'null');
  const last = JSON.parse(localStorage.getItem('lastSleepResult')||'null');
  if(saved) Object.entries(saved).forEach(([k,v])=>{ const el = document.querySelector(`input[name="${k}"][value="${v}"]`); if(el) el.checked=true; });
  if(last){
    const footer = document.querySelector('footer');
    const btn = document.createElement('button'); btn.className='btn ghost'; btn.style.marginLeft='10px'; btn.textContent='View last result';
    btn.addEventListener('click', ()=>{ const obj = last; window._shareText = `Sleep Score: ${obj.score}/100 — ${obj.persona} — ${obj.circadian}`; document.getElementById('summary').innerHTML = `<div><strong>Previously saved result:</strong></div><div style="margin-top:8px">Score: ${obj.score}/100 — ${obj.persona} — ${obj.circadian}</div>`; showPage(pages.findIndex(p=>p.id==='results')); updateProgress(pages.findIndex(p=>p.id==='results')); });
    footer.appendChild(btn);
  }
})();

// init
showPage(0);
updateProgress(0);
