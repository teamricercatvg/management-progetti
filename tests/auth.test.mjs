import test from "node:test";
import assert from "node:assert/strict";
import {
  appOrigin,
  validPassword,
  validEmail,
} from "../src/lib/validation.mjs";
test("redirect origin rejects non-web URLs, credentials and paths", () => {
  for (const origin of [
    "javascript:alert(1)",
    "https://a.test/evil",
    "http://a.test",
    "https://user:pass@a.test",
    "https://a.test/?next=evil",
  ])
    assert.throws(() => appOrigin(origin));
  assert.equal(appOrigin("http://127.0.0.1:3000"), "http://127.0.0.1:3000");
  assert.equal(
    appOrigin("https://www.ariadne-hub.it"),
    "https://www.ariadne-hub.it",
  );
});
test("credentials validated before sending to Auth", () => {
  assert.equal(validPassword("short"), false);
  assert.equal(validPassword("a".repeat(129)), false);
  assert.equal(validPassword("a secure long password"), true);
  assert.equal(validEmail("alice@example.test"), true);
  for (const email of ["", "a@b", "a b@c.test"])
    assert.equal(validEmail(email), false);
});
