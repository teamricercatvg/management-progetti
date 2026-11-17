import {test} from 'node:test';
import assert from 'node:assert/strict';
import {financialHistory} from '../src/lib/finance-history.mjs';
test('Only latest versions remain, including when latest is annulled',()=>{
 const rows=[{id:'v2',correction_of_id:'v1',status:'voided'},{id:'other',status:'voided'},{id:'v1',status:'voided'},{id:'v3',correction_of_id:'v2',status:'voided'}];
 const history=financialHistory(rows);
 assert.deepEqual(history.current.map(e=>e.id),['other','v3']);
 assert.equal(history.currentId('v1'),'v3');
 assert.deepEqual(history.versions('v3').map(e=>e.id),['v3','v2','v1']);
});
test('Unlinked annullments remain visible and references do not imply history',()=>{
 const history=financialHistory([{id:'a',reference:'SPE-1'},{id:'b',reference:'SPE-1-R1',correction_of_id:'missing'}]);
 assert.equal(history.current.length,2);
 assert.equal(history.versions('b').length,1);
});
