import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inforEuroRate,inforEuroUrl,convertedCents} from '../src/lib/inforeuro.mjs';
test('InforEuro reciprocates foreign units per EUR at SQL precision',()=>{
 assert.equal(inforEuroRate([{isoA3Code:'MWK',value:2000}], 'MWK'),'0.000500000000');
 assert.equal(inforEuroRate([{isoA3Code:'USD',value:1.1}], 'USD'),'0.909090909091');
 assert.equal(inforEuroUrl('2026-10'),'https://ec.europa.eu/budg/inforeuro/api/public/monthly-rates?year=2026&month=10&lang=en');
});
test('InforEuro rejects unavailable, malformed and conflicting rates',()=>{
 for(const value of [0,-1,'NaN',null]) assert.throws(()=>inforEuroRate([{isoA3Code:'MWK',value}], 'MWK'));
 assert.throws(()=>inforEuroRate([], 'MWK'));
 assert.throws(()=>inforEuroRate([{isoA3Code:'MWK',value:2},{isoA3Code:'MWK',value:3}], 'MWK'));
 assert.throws(()=>inforEuroUrl('2026-13'));
});

test('Expense preview rounds at cents with six-decimal foreign amounts',()=>{
 assert.equal(convertedCents('200000','0.000500000000'),10000n);
 assert.equal(convertedCents('1.005','1'),101n);
 assert.equal(convertedCents('0.000001','500000'),50n);
 assert.equal(convertedCents('2,5','0.5'),125n);
 assert.equal(convertedCents('', '1'),null);
 assert.equal(convertedCents('-1', '1'),null);
});
