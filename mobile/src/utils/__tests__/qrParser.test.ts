import assert from 'node:assert/strict';
import test from 'node:test';
import { parseGmRemoteQr } from '../qrParser';

const id = '8f420e10-3942-4913-9114-61cbf5727b11';

test('parses the production QR and extracts its fragment token', () => {
  assert.deepEqual(parseGmRemoteQr(`https://www.barberanddragons.com/gm-remote/j/${id}#t=secret-token`), {
    publicId: id,
    token: 'secret-token',
    baseUrl: 'https://www.barberanddragons.com',
  });
});

test('accepts loopback HTTP for a locally forwarded development server', () => {
  assert.equal(parseGmRemoteQr(`http://localhost:3001/gm-remote/j/${id}?t=local-token`)?.baseUrl, 'http://localhost:3001');
});

test('rejects pairing links without a token, with a wrong path, or on an untrusted host', () => {
  assert.equal(parseGmRemoteQr(`https://barberanddragons.com/gm-remote/j/${id}`), null);
  assert.equal(parseGmRemoteQr(`https://barberanddragons.com/other/${id}#t=secret`), null);
  assert.equal(parseGmRemoteQr(`https://attacker.example/gm-remote/j/${id}#t=secret`), null);
  assert.equal(parseGmRemoteQr(`http://attacker.example/gm-remote/j/${id}#t=secret`), null);
  assert.equal(parseGmRemoteQr(`https://user@barberanddragons.com/gm-remote/j/${id}#t=secret`), null);
});

test('accepts a manually entered UUID with a supplied trusted base URL', () => {
  assert.deepEqual(parseGmRemoteQr(id, 'https://barberanddragons.com/path'), {
    publicId: id,
    token: undefined,
    baseUrl: 'https://barberanddragons.com',
  });
  assert.equal(parseGmRemoteQr(id, 'https://attacker.example'), null);
  assert.equal(parseGmRemoteQr('not-a-public-id'), null);
});

test('rejects malformed percent escapes in the pairing token', () => {
  assert.equal(parseGmRemoteQr(`https://barberanddragons.com/gm-remote/j/${id}#t=%E0%A4%A`), null);
});
