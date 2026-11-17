import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inforEuroRate,inforEuroUrl} from '../src/lib/inforeuro.mjs';
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
