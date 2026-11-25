import {defaults,queue,occupancy,lifecycle,annualRisk,checks} from './src/engines/model.mjs';
const $ = selector => document.querySelector(selector);
const money = value => '₱'+Math.round(value).toLocaleString('en-PH');
const percent = value => (100*value).toFixed(1)+'%';
const scenarios = [
 {name:'Saturday booking rush', short:'Demand for the 9:00 AM class spikes', tag:'CAPACITY', story:'Four mats are available. A burst of booking requests arrives while earlier clients are still paying. Some clients never finish checkout.', fork:'How should the booking system handle repeated requests?', options:['Keep the standard hold','Deduplicate repeat requests'], outcomes:['The 15-minute hold protects every accepted request, including ones that never pay.','Deduplication removes repeated attempts from the modeled arrival stream and preserves the 15-minute hold.'], before:{lambda:29,mu:5,c:2,K:4,tau:15}, after:{lambda:14}},
 {name:'PayMongo outage', short:'Payments move to manual verification',tag:'PAYMENT',story:'The gateway becomes unavailable with clients mid-checkout. The proposal allows GCash or BPI proof submission as a fallback, with administrator review.',fork:'How should checkout continue during the outage?',options:['Wait for gateway recovery','Enable verified fallback'],outcomes:['A slow recovery leaves more holds to expire before payment completes.','The fallback accelerates completion in this model. Submitted proofs still require administrator approval.'],before:{lambda:15,mu:1,c:1,K:4,tau:15},after:{mu:5,c:2},manual:0.8},
 {name:'Class cancellation',short:'Confirmed clients need another session',tag:'TRANSFERS',story:'The administrator cancels the 9:00 AM class and notifies affected clients. Two clients choose to transfer to the 10:15 AM session.',fork:'Which schedule should clients be offered?',options:['Offer one confirmed opening','Open another fixed-time session'],outcomes:['Two transferred bookings occupy two mats in the next session.','The administrator opens a separate eligible session. One transfer goes to each session, so the plotted session starts with one occupied mat.'],before:{lambda:12,mu:5,c:2,K:3,tau:15},after:{},transfer:[2,1]},
];
const steps=['Read the incident','Choose a response','Inspect outcomes'];
const labels={lambda:['Booking arrival rate λ','requests/hr',1,40,1],mu:['Checkout completion rate μ','per hr',1,20,1],c:['Parallel checkout lanes c','lanes',1,3,1],K:['Class capacity K','mats',3,4,1],tau:['Hold duration τ','min',5,30,1]};
let params={...defaults}, page='scenarios', scenario=0, step=0, choice=0, riskFactor=1;
let scene=null, lab=null, risk=null, riskRequest=0, clock=0, running=false,lastFrame=0;
let worker;
try {worker=new Worker('./risk-worker.mjs',{type:'module'});worker.onmessage=({data})=>{if(data.id===riskRequest){risk=data;updateRisk();}};worker.onerror=()=>{worker.terminate();worker=null;requestRisk();};} catch {}
const metric=(name,value)=>'<div class="metric"><strong>'+value+'</strong><span>'+name+'</span></div>';
const safeTheme=()=>{try{return localStorage.getItem('block69-theme');}catch{return null;}};
document.documentElement.dataset.theme=safeTheme()==='light'?'light':'dark';
$('#theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark'; document.documentElement.dataset.theme=theme;try{localStorage.setItem('block69-theme',theme);}catch{} draw(performance.now());};
function requestRisk(){
  risk=null;
  const id=++riskRequest;
  if(worker)worker.postMessage({id,factor:riskFactor});
  else {risk={a:annualRisk(42,riskFactor),b:annualRisk(2026,riskFactor)};updateRisk();}
}
function updateRisk(){
  const target=$('#risk-metrics');
  if(target&&risk)target.innerHTML=metric('Mean annual loss',money(risk.a.ale))+metric('95th percentile',money(risk.a.p95))+metric('Simulated years','10,000');
  if($('#validation').open)verify();
  if(page==='lab')draw(performance.now());
}
function verify(){
  $('#checks').innerHTML=risk?checks(params,risk.a,risk.b).map(([name,standard,value,pass])=>'<div class="check"><strong>'+name+'</strong><p>'+standard+'</p><span class="'+(pass?'pass':'fail')+'">'+(pass?'PASS':'FAIL')+' · '+value+'</span></div>').join(''):'Running Monte Carlo trials…';
}
$('#verify').onclick=()=>{$('#validation').showModal();verify();};
document.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>{page=button.dataset.page;render();});
function render(){
  document.querySelectorAll('[data-page]').forEach(button=>{if(button.dataset.page===page)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  $('#kicker').textContent='RESERVATION OPERATIONS / '+page.toUpperCase();
  const titles={scenarios:['One class. Four slots.','See how Block 69 Pilates handles booking surges, payment outages, and class cancellations.'],lab:['Reservation lab','Tune a class and see how checkout pressure changes the number of bookings it can accept.'],codex:['Model reference','Follow the equations, assumptions, and privacy controls behind the simulation.']};
  [$('#title').textContent,$('#desc').textContent]=titles[page];
  if(page==='scenarios')renderScenario();
  if(page==='lab')renderLab();
  if(page==='codex')renderCodex();
  draw(performance.now());
}
function renderScenario(){
  const s=scenarios[scenario];
  const current=choice?{...s.before,...s.after}:s.before;
  const base=occupancy(s.before,s.transfer?.[0]??0), result=occupancy(current,s.transfer?.[choice]??0);
  scene={base,result,K:current.K};
  const baseQ=queue(s.before), nextQ=queue(current);
  const metricNames=s.transfer?['Mats free at opening','Mats free after response']:['Baseline queue blocking','Response queue blocking'];
  const values=s.transfer?[current.K-s.transfer[0],current.K-s.transfer[choice]]:[percent(baseQ.blocked),percent(nextQ.blocked)];
  const narrative=[s.story,s.fork,s.outcomes[choice]];
  $('#view').innerHTML='<div class="layout"><aside class="card scenario-list"><h2>Incident library</h2>'+scenarios.map((item,i)=>'<button data-scenario="'+i+'" aria-pressed="'+(i===scenario)+'">'+item.name+'<span>'+item.short+'</span></button>').join('')+'</aside><div class="stack"><article class="card"><div class="workspace-title"><div><p class="eyebrow">STEP '+(step+1)+' OF 3 · '+steps[step].toUpperCase()+'</p><h2>'+s.name+'</h2></div><span class="tag">'+s.tag+'</span></div><p>'+narrative[step]+'</p><div class="actions">'+(step===1?s.options.map((name,i)=>'<button data-choice="'+i+'" class="'+(i===1?'primary':'')+'">'+name+'</button>').join(''):(step===0?'<button id="forward" class="primary">Choose response</button>':'<button id="back">Change response</button>'))+'</div></article><article class="card"><h2>Before and after</h2><p class="note">One seeded booking hour. A confirmed mat stays occupied for the rest of the window.</p><div class="metrics">'+metric(metricNames[0],values[0])+metric(metricNames[1],values[1])+metric('Blocked attempts in replay',result.blocked+' / '+result.attempts)+'</div><canvas id="trend" role="img" aria-label="Baseline and response occupied mats over time"></canvas><p class="legend">Dashed: baseline · Solid: selected response · Occupied = held + confirmed</p></article></div></div>';
  document.querySelectorAll('[data-scenario]').forEach(b=>b.onclick=()=>{scenario=Number(b.dataset.scenario);step=0;choice=0;render();$('#forward').focus();});
  document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{choice=Number(b.dataset.choice);step=2;render();$('#back').focus();});
  if($('#forward'))$('#forward').onclick=()=>{step=1;render();$('[data-choice]').focus();};
  if($('#back'))$('#back').onclick=()=>{step=1;render();$('[data-choice]').focus();};
}
function renderLab(){
  $('#view').innerHTML='<div class="layout"><aside class="card"><h2>Class parameters</h2><p>Default hold is 15 minutes. Other durations are what-if tests.</p>'+Object.entries(labels).map(([key,[name,unit,min,max,inc]])=>'<label class="control">'+name+'<output id="out-'+key+'">'+params[key]+' '+unit+'</output><input data-param="'+key+'" type="range" min="'+min+'" max="'+max+'" step="'+inc+'" value="'+params[key]+'"></label>').join('')+'<hr class="divider"><div class="actions"><button id="play" class="primary">'+(running?'Pause':'Play booking hour')+'</button><button id="reset">Reset defaults</button></div></aside><div class="stack"><article class="card"><div class="workspace-title"><h2>Class floor</h2><span class="tag" id="minute">0.0 MIN</span></div><canvas id="floor" role="img" aria-label="Pilates mat occupancy"></canvas><p class="legend" id="floor-legend">Waiting for requests</p><div id="queue-metrics" class="metrics"></div><h3>Steady-state checkout occupancy</h3><canvas id="distribution" role="img" aria-label="Probability of each checkout occupancy level"></canvas><p class="legend">The checkout queue and the booking replay use distinct models. See Codex for their assumptions.</p></article><article class="card"><h2>Booking lifecycle</h2><canvas id="graph" role="img" aria-label="Animated Markov booking lifecycle"></canvas><p id="markov" class="legend"></p><details><summary>Transition matrix</summary><div id="matrix"></div></details></article><article class="card"><div class="workspace-title"><h2>Annual loss simulation</h2><label>Controls <select id="risk-control"><option value="1">Baseline</option><option value=".5">Lower incident frequency</option></select></label></div><p>Illustrative losses from service disruptions and payment-review incidents.</p><div id="risk-metrics" class="metrics" aria-live="polite">Running trials…</div><canvas id="hist" role="img" aria-label="Distribution of simulated annual losses in Philippine pesos"></canvas><p class="legend" id="risk-detail">Synthetic annual loss estimates in PHP.</p></article></div></div>';
  document.querySelectorAll('[data-param]').forEach(input=>input.oninput=()=>{
    const key=input.dataset.param,[,unit,min,max]=labels[key],value=Number(input.value);
    params[key]=Number.isFinite(value)?Math.max(min,Math.min(max,value)):defaults[key];
    $('#out-'+key).textContent=params[key]+' '+unit;clock=0;updateLab();draw(performance.now());
  });
  $('#play').onclick=()=>{if(clock>=60)clock=0;running=!running;$('#play').textContent=running?'Pause':'Play booking hour';};
  $('#reset').onclick=()=>{params={...defaults};clock=0;running=false;riskFactor=1;renderLab();requestRisk();draw(performance.now());$('#reset').focus();};
  $('#risk-control').value=String(riskFactor);
  $('#risk-control').onchange=()=>{riskFactor=Number($('#risk-control').value)===.5?.5:1;$('#risk-metrics').textContent='Running trials…';requestRisk();};
  updateLab();updateRisk();
}
function updateLab(){
  lab={booking:occupancy(params),q:queue(params),matrix:lifecycle(params)};
  $('#queue-metrics').innerHTML=metric('Checkout blocking',percent(lab.q.blocked))+metric('Admitted requests/hr',lab.q.effective.toFixed(2))+metric('Mean queue wait',(lab.q.wait*60).toFixed(2)+' min');
  const names=['Held','Review','Confirmed','Released'];
  $('#markov').textContent='From Held: '+lab.matrix[0].slice(1).map((value,i)=>percent(value)+' '+names[i+1].toLowerCase()).join(' · ')+'.';
  $('#matrix').innerHTML='<table><thead><tr><th>From / To</th>'+names.map(n=>'<th>'+n+'</th>').join('')+'</tr></thead><tbody>'+lab.matrix.map((row,i)=>'<tr><th scope="row">'+names[i]+'</th>'+row.map(v=>'<td>'+percent(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
}
function renderCodex(){
  $('#view').innerHTML='<div class="layout"><aside class="card"><h2>Proposal inputs</h2><p>Thu–Sat at Block 69 Cafe, Comembo, Taguig City</p><p>9:00–9:50 AM and 10:15–11:05 AM (PHT)<br>3–4 mats per session<br>15-minute hold<br>₱500 fee and ₱50 optional mat rental</p><p>PayMongo auto-confirmation, GCash/BPI manual review, and transfers after an administrator cancels a class.</p><a href="https://qmodsim-example-app-proposal.teachermaestro.xyz/">Professor’s reference site</a></aside><div class="stack"><article class="card"><h2>Arrivals and capacity</h2><p>λ counts booking attempts/hour, μ counts checkout completions/hour/lane, c is the number of modeled online lanes, K is the class capacity and τ is the hold duration in minutes. Lab rates and the lane count are synthetic assumptions.</p><ol><li>Draw inter-arrival time T = −ln(U) / λ hours for independent uniform U. Then E[T] = 1 / λ and the count per hour is Poisson.</li><li>For finite M/M/c/K checkout, set w₀ = 1 and wₙ = wₙ₋₁ · λ / (min(n,c) · μ). Normalize pₙ = wₙ / Σwⱼ.</li><li>Blocking is pₖ and admitted throughput is λₑ = λ · (1 − pₖ). Mean system occupancy L is Σ n · pₙ. Mean queue occupancy Lq is Σ max(0,n − c) · pₙ. Wq = Lq / λₑ.</li><li>The separate booking replay admits arrivals only while a mat is free. Payment converts a hold to a confirmation. If the payment clock is longer than τ, expiry releases the mat. Confirmed mats remain occupied through the booking window. The checkout approximation has no fixed expiry or lasting confirmations.</li></ol></article><article class="card"><h2>Markov lifecycle and risk</h2><p>The Held state expires with probability e^(−μ · τ / 60). The remaining probability is split between Review (20% share) and Confirmed (80%). Review resolves to Confirmed with probability 0.85 and Released with 0.15. These are illustrative inputs. Confirmed and Released are absorbing in this model.</p><p>Split the matrix into transient Q and absorption R. N = (I − Q)⁻¹, B = N · R, and expected steps are N · 1. Here Q’s only nonzero entry routes Held to Review, so Q² = 0 and N = I + Q.</p><p>The FAIR-inspired model draws incident counts from Poisson(4/year) and individual losses from a lognormal distribution with median ₱2,200 and log-scale σ = 0.35. Annual losses sum incident costs. ALE is the mean across 10,000 synthetic years. The control halves the incident rate. Figures are illustrative planning assumptions.</p></article><article class="card"><h2>Privacy crosswalk</h2><table><thead><tr><th>RA 10173</th><th>Production design consideration</th></tr></thead><tbody><tr><td>§11 · Data privacy principles</td><td>State the booking purpose and minimize account, receipt, and profile fields. Set retention limits.</td></tr><tr><td>§13 · Sensitive information</td><td>Identify an applicable basis before processing health disclosures and restrict access to authorized staff.</td></tr><tr><td>§16 · Data subject rights</td><td>Explain processing and give clients a route to request access or correction.</td></tr><tr><td>§20 · Security</td><td>Apply role-based access, protected receipt storage, transport encryption, and audit trails.</td></tr></tbody></table><p class="legend"><a href="https://privacy.gov.ph/Data-Privacy-Act/">National Privacy Commission · Data Privacy Act of 2012</a></p></article></div></div>';
}
function canvas(id){
  const el=$('#'+id);
  if(!el)return null;
  const w=el.clientWidth,h=el.clientHeight,d=Math.min(window.devicePixelRatio||1,2);
  if(el.width!==Math.round(w*d)||el.height!==Math.round(h*d)){el.width=Math.round(w*d);el.height=Math.round(h*d);}
  const g=el.getContext('2d');
  g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);
  const css=getComputedStyle(document.documentElement);
  const color=name=>css.getPropertyValue('--'+name).trim();
  g.font='12px monospace';return {g,w,h,color};
}
function stroke(g,points,color,dash=[]){
  g.strokeStyle=color;g.lineWidth=2;g.setLineDash(dash);g.beginPath();
  points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();g.setLineDash([]);
}
function timeline(){
  const {g,w,h,color}=canvas('trend'), left=34,right=w-14,top=18,bottom=h-31;
  const x=t=>left+t/60*(right-left),y=n=>bottom-n/scene.K*(bottom-top);
  g.fillStyle=color('muted');
  for(let n=0;n<=scene.K;n++){stroke(g,[[left,y(n)],[right,y(n)]],color('line'));g.fillText(n,13,y(n)+4);}
  for(let t=0;t<=60;t+=15)g.fillText(t+(t===60?'m':''),x(t)-(t===60?20:6),h-10);
  for(const [run,hue,dash] of [[scene.base,'muted',[6,5]],[scene.result,'accent',[]]]){
    const points=[[left,y(run.history[0].slots.length)]];
    let count=run.history[0].slots.length;
    for(const event of run.history.slice(1)){
      points.push([x(event.minute),y(count)]);count=event.slots.length;points.push([x(event.minute),y(count)]);
    }
    points.push([right,y(count)]);stroke(g,points,color(hue),dash);
  }
}
function bars(id,values,ticks){
  const {g,w,h,color}=canvas(id), left=44,bottom=h-32,chartW=w-left-12;
  const max=Math.max(...values,0.00001);
  for(let i=0;i<=4;i++){
    const y=bottom-(bottom-18)*i/4;stroke(g,[[left,y],[w-12,y]],color('line'));
    g.fillStyle=color('muted');g.fillText(id==='hist'?Math.round(max*i/4):Math.round(max*i/4*100)+'%',4,y+4);
  }
  const barW=chartW/values.length;
  values.forEach((v,i)=>{
    const high=(bottom-18)*v/max;
    g.fillStyle=color(i===values.length-1&&id==='distribution'?'red':'accent');g.fillRect(left+i*barW+barW*.13,bottom-high,barW*.74,high);
    if(ticks[i]){g.fillStyle=color('muted');g.textAlign='center';g.fillText(ticks[i],left+(i+.5)*barW,h-10);g.textAlign='start';}
  });
}
function floor(){
  const {g,w,h,color}=canvas('floor');
  const state=lab.booking.history.findLast(item=>item.minute<=clock).slots;
  const block=(w-12)/params.K;
  for(let i=0;i<params.K;i++){
    const status=state[i]??'Open', tone={Open:'muted',Held:'accent',Confirmed:'green'}[status];
    const x=6+block*i+block*.12, mat=block*.76;
    g.fillStyle=color(status==='Held'?'fill':'sub');g.strokeStyle=color(tone);
    g.beginPath();g.roundRect(x,15,mat,h-47,7);g.fill();g.stroke();
    g.beginPath();g.moveTo(x+9,26);g.lineTo(x+mat-9,26);g.stroke();
    g.fillStyle=color(tone);g.textAlign='center';g.fillText(status,x+mat/2,h-12);
  }
  $('#minute').textContent=clock.toFixed(1)+' MIN';
  $('#floor-legend').textContent=state.filter(s=>s==='Held').length+' held · '+state.filter(s=>s==='Confirmed').length+' confirmed · '+(params.K-state.length)+' open';
}
function graph(now){
  const {g,w,h,color}=canvas('graph');
  const point=[[w*.14,h*.5],[w*.48,h*.25],[w*.84,h*.25],[w*.84,h*.76]];
  const links=[[0,1],[0,2],[0,3],[1,2],[1,3]];
  links.forEach(([a,b])=>stroke(g,[point[a],point[b]],color('line')));
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t=reduce?.5:(now%2100)/2100;
  links.forEach(([a,b])=>{
    if(lab.matrix[a][b]<=0)return;
    const [x,y]=point[a], [endX,endY]=point[b];
    g.fillStyle=color('accent');g.beginPath();g.arc(x+(endX-x)*t,y+(endY-y)*t,3,0,2*Math.PI);g.fill();
  });
  ['Held','Review','Confirmed','Released'].forEach((label,i)=>{
    const [x,y]=point[i], width=Math.min(w*.28,92);g.fillStyle=color('sub');g.strokeStyle=color('accent');
    g.beginPath();g.roundRect(x-width/2,y-13,width,26,4);g.fill();g.stroke();
    g.fillStyle=color('text');g.textAlign='center';g.fillText(label,x,y+4);
  });
}
function draw(now){
  if(page==='scenarios'&&scene)timeline();
  if(page==='lab'&&lab){
    floor();graph(now);bars('distribution',lab.q.p,lab.q.p.map((_,i)=>String(i)));
    if(risk){
      const bins=Array(10).fill(0);
      const ceiling=Math.max(10000,Math.ceil(risk.a.p95/5000)*5000);
      risk.a.losses.forEach(v=>bins[Math.min(9,Math.floor(v/ceiling*10))]++);
      const ticks=bins.map((_,i)=>i%3===0?(i*ceiling/10000).toLocaleString()+'k':'');
      bars('hist',bins,ticks);
      $('#risk-detail').textContent='Annual loss by starting bin (PHP). Each bin spans '+money(ceiling/10)+'. The last bin includes all higher losses.';
    }
  }
}
function tick(now){
  if(page==='lab'){
    if(running){
      clock=Math.min(60,clock+Math.min(now-lastFrame,100)*.003);
      if(clock===60){running=false;$('#play').textContent='Replay booking hour';}
      floor();
    }
    graph(now);
  }
  lastFrame=now;requestAnimationFrame(tick);
}
window.addEventListener('resize',()=>draw(performance.now()));
render();requestRisk();requestAnimationFrame(tick);
