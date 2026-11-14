import test from 'node:test';
import assert from 'node:assert/strict';
import { accountSetup } from '../src/lib/account-setup.mjs';
test('email confirmation and token sign-in do not prove password setup', () => {
  assert.equal(accountSetup({invited_at:'2026-11-14'}), 'Da confermare');
  const user = {email_confirmed_at:'2026-11-14', last_sign_in_at:'2026-11-14', user_metadata:{ariadne_password_verified_at:'forged'}};
  assert.equal(accountSetup(user), 'Da confermare');
  assert.equal(accountSetup({...user, app_metadata:{ariadne_password_verified_at:'2026-11-14'}}), 'Abilitato');
  assert.equal(accountSetup(user, false), 'Disabilitato');
  assert.equal(accountSetup({...user, app_metadata:{ariadne_password_verified_at:'2026-11-14'}}, false), 'Disabilitato');
  assert.equal(accountSetup(null), 'Stato non disponibile');
});
