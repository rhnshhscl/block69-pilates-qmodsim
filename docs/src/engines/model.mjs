export const defaults = {lambda: 12, mu: 5, c: 2, K: 4, tau: 15};
export function queue({lambda, mu, c, K}) {
  const weights = [1];
  for (let n = 1; n <= K; n++) weights.push(weights[n-1]*lambda/(Math.min(n,c)*mu));
  const total = weights.reduce((a,b)=>a+b);
  const p = weights.map(w=>w/total);
  const effective = lambda*(1-p[K]);
  const length = p.reduce((sum,v,n)=>sum+n*v,0);
  const occupied = p.reduce((sum,v,n)=>sum+Math.min(n,c)*v,0);
  return {p, blocked:p[K], effective, length, occupied, wait:(length-occupied)/effective, time:length/effective};
}
export function seeded(seed) {
  return () => {
    seed = (Math.imul(1664525,seed)+1013904223) >>> 0;
    return (seed+0.5)/4294967296;
  };
}
export function lifecycle({mu,tau}, manual=0.20) {
  const elapsed = Math.exp(-mu*tau/60);
  return [[0,(1-elapsed)*manual,(1-elapsed)*(1-manual),elapsed],
          [0,0,0.85,0.15],[0,0,1,0],[0,0,0,1]];
}
export function occupancy({lambda,mu,K,tau}, transfer=0, seed=22) {
  const random=seeded(seed), history=[{minute:0,slots:Array(transfer).fill("Confirmed")}];
  let minute=0, attempts=0, blocked=0, confirmed=0, expired=0;
  let slots=Array.from({length:transfer},()=>({until:Infinity,paid:true}));
  while (minute<60) {
    const arrival=minute-Math.log(random())*60/lambda;
    const release=Math.min(...slots.map(s=>s.until));
    minute=Math.min(arrival,release,60);
    if (minute===60) break;
    if (minute===release) {
      const slot=slots.find(s=>s.until===release);
      if (slot.willPay) {slot.paid=true;slot.until=Infinity;confirmed++;}
      else {slots=slots.filter(s=>s!==slot);expired++;}
    } else {
      attempts++;
      if(slots.length===K) blocked++;
      else {
        const payment=-Math.log(random())*60/mu;
        slots.push({until:minute+Math.min(payment,tau),willPay:payment<=tau,paid:false});
      }
    }
    history.push({minute,slots:slots.map(s=>s.paid?'Confirmed':'Held')});
  }
  return {history,attempts,blocked,confirmed,expired};
}
export function annualRisk(seed, factor=1, trials=10000) {
  const random=seeded(seed);
  const losses=[];
  for(let i=0;i<trials;i++){
    // Draw a Poisson annual incident count using a product of uniforms.
    const limit=Math.exp(-4*factor);
    let product=random(), loss=0;
    while(product>limit){
      const z=Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random());
      loss+=Math.exp(Math.log(2200)+0.35*z);
      product*=random();
    }
    losses.push(loss);
  }
  losses.sort((a,b)=>a-b);
  return {ale:losses.reduce((a,b)=>a+b,0)/trials,p95:losses[Math.ceil(trials*.95)-1],losses};
}
export function checks(params,riskA,riskB) {
  const random=seeded(42);
  let sample=0;
  for(let i=0;i<50000;i++)sample-=Math.log(random())/params.lambda/50000;
  const poisson=Math.abs(sample*params.lambda-1);
  const q=queue(params);
  const little=Math.max(Math.abs(q.length-q.effective*q.time),Math.abs(q.length-q.occupied-q.effective*q.wait));
  const rows=Math.max(...lifecycle(params).map(row=>Math.abs(1-row.reduce((a,b)=>a+b))));
  const convergence=Math.abs(riskA.ale-riskB.ale)/riskA.ale;
  return [
    ['Poisson inter-arrivals','Relative error < 2%',(100*poisson).toFixed(3)+'%',poisson<.02],
    ['Little’s Law','Residual < 10⁻⁵',little.toExponential(2),little<1e-5],
    ['Markov row sums','Residual < 10⁻⁵',rows.toExponential(2),rows<1e-5],
    ['Monte Carlo convergence','ALE difference < 1.5%',(100*convergence).toFixed(3)+'%',convergence<.015],
  ];
}
