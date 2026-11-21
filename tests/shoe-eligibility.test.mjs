import test from 'node:test';
import assert from 'node:assert/strict';
import { shoeEligibility } from '../lib/shoe-eligibility.ts';
function records(first, count, raceIndex) {
 const runs = Array.from({length:count}, (_,i) => ({id:String(i),date:new Date(Date.parse(first+'T12:00:00Z')+i*7*86400000).toISOString().slice(0,10)}));
 return {runs,attendance:runs.map(r=>({runId:r.id,runnerId:'p',attended:true})),raceResults:raceIndex===undefined?[]:[{runnerId:'p',runId:String(raceIndex),finishSeconds:1800}]};
}
test('earlier participants keep four-run rule across cutoff',()=>{
 assert.equal(shoeEligibility(records('2026-11-21',4),{id:'p'}).earned,true);
});
test('cutoff inclusive: six runs alone do not earn shoes',()=>{
 const s=shoeEligibility(records('2026-11-28',6),{id:'p'});assert.equal(s.earned,false);assert.equal(s.requiredRuns,6);
});
test('race before sixth run qualifies only at sixth',()=>{
 assert.equal(shoeEligibility(records('2026-11-28',5,2),{id:'p'}).earned,false);
 const data=records('2026-11-28',6,2);assert.equal(shoeEligibility(data,{id:'p'}).earnedOn,data.runs[5].date);
});
test('race after six runs delays eligibility and supports profile completion',()=>{
 const data=records('2026-11-28',6);assert.equal(shoeEligibility(data,{id:'p',fiveKCompletedDate:'2027-01-15'}).earnedOn,'2027-01-15');
});
test('stored earlier join date preserves legacy rule and duplicate attendance is ignored',()=>{
 const data=records('2026-11-28',4);data.attendance.push(data.attendance[0]);
 assert.equal(shoeEligibility(data,{id:'p',dateFirstJoined:'2026-11-20'}).earned,true);
 assert.equal(shoeEligibility(data,{id:'p'}).earned,false);
});
test('unchecked attendance and invalid race result do not count',()=>{
 const data=records('2026-11-28',6,1);data.raceResults[0].finishSeconds=0;assert.equal(shoeEligibility(data,{id:'p'}).earned,false);
 data.raceResults[0].finishSeconds=1800;data.attendance[0].attended=false;assert.equal(shoeEligibility(data,{id:'p'}).earned,false);
});
