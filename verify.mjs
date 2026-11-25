import assert from 'node:assert/strict';
import {defaults,queue,occupancy,lifecycle,annualRisk,checks} from './dist/src/engines/model.mjs';
for(const factor of [1,.5]){
  const a=annualRisk(42,factor),b=annualRisk(2026,factor);
  assert.equal(a.losses.length,10000);
  for(const result of checks(defaults,a,b)) assert.ok(result[3],result[0]);
}
for(const K of [3,4])for(const lambda of [1,12,40])for(const mu of [1,5,20])for(const c of [1,2,3])for(const tau of [5,15,30]){
  const inputs={K,lambda,mu,c,tau},q=queue(inputs);
  assert.ok(Math.abs(q.p.reduce((a,b)=>a+b)-1)<1e-12);
  assert.ok(q.blocked>0&&q.blocked<1);
  assert.ok(Math.abs(q.length-q.occupied-q.effective*q.wait)<1e-12);
  assert.ok(occupancy(inputs,2).history.every(event=>event.slots.length<=K));
  assert.ok(lifecycle(inputs).every(row=>row.every(p=>p>=0&&p<=1)&&Math.abs(row.reduce((a,b)=>a+b)-1)<1e-12));
}
assert.ok(queue({...defaults,lambda:29}).blocked>queue({...defaults,lambda:14}).blocked);
assert.ok(queue({...defaults,lambda:15,mu:1,c:1}).blocked>queue({...defaults,lambda:15}).blocked);
assert.equal(occupancy({...defaults,K:3},1).history[0].slots.length,1);
console.log('Passed both risk configurations, 162 parameter combinations and all three scenario comparisons.');
