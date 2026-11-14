import test from 'node:test';
import assert from 'node:assert/strict';
import { accountSetup } from '../src/lib/account-setup.mjs';
test('pending invitations become enabled on Auth confirmation, including existing users', () => {
  assert.equal(accountSetup({invited_at:'2026-11-14'}), 'Da confermare');
  assert.equal(accountSetup({invited_at:'2026-11-14', user_metadata:{email_confirmed_at:'forged'}}), 'Da confermare');
  const user = {email_confirmed_at:'2026-11-14', last_sign_in_at:'2026-11-14'};
  assert.equal(accountSetup(user), 'Abilitato');
  assert.equal(accountSetup({email_confirmed_at:'2026-11-14'}), 'Abilitato');
  assert.equal(accountSetup(user, false), 'Disabilitato');
  assert.equal(accountSetup({invited_at:'2026-11-14'}, false), 'Disabilitato');
  assert.equal(accountSetup(null), 'Stato non disponibile');
});
