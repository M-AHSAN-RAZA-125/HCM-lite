import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  deleteFaceEnrollment,
  enrollFace,
  isFaceProviderConfigured,
  verifyFace,
} from './faceProvider.js';

const originalUrl = process.env.FACE_VERIFICATION_PROVIDER_URL;
const originalKey = process.env.FACE_VERIFICATION_API_KEY;
const originalFetch = globalThis.fetch;
const imageDataUrl = `data:image/jpeg;base64,${Buffer.from('live-frame').toString('base64')}`;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.FACE_VERIFICATION_PROVIDER_URL;
  else process.env.FACE_VERIFICATION_PROVIDER_URL = originalUrl;
  if (originalKey === undefined) delete process.env.FACE_VERIFICATION_API_KEY;
  else process.env.FACE_VERIFICATION_API_KEY = originalKey;
  globalThis.fetch = originalFetch;
});

function configureProvider() {
  process.env.FACE_VERIFICATION_PROVIDER_URL = 'https://face.example.test';
  process.env.FACE_VERIFICATION_API_KEY = 'test-secret';
}

test('fails closed when provider credentials are absent', async () => {
  delete process.env.FACE_VERIFICATION_PROVIDER_URL;
  delete process.env.FACE_VERIFICATION_API_KEY;
  assert.equal(isFaceProviderConfigured(), false);
  await assert.rejects(enrollFace(imageDataUrl, 'subject-1'), { status: 503 });
  assert.equal(await verifyFace(imageDataUrl, 'enrollment-1').catch((error) => error.status), 503);
});

test('does not accept enrollment without provider liveness approval', async () => {
  configureProvider();
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ success: true, enrollmentId: 'enrollment-1', liveness: 'unknown' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  await assert.rejects(enrollFace(imageDataUrl, 'subject-1'), { status: 422 });
});

test('sends biometric requests only to the server-configured provider', async () => {
  configureProvider();
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    const result = url.endsWith('/enroll')
      ? { success: true, enrollmentId: 'enrollment-1', liveness: 'passed' }
      : url.endsWith('/match')
        ? { matched: true, enrollmentId: 'enrollment-1', liveness: 'passed' }
        : { matched: true, liveness: 'passed' };
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  assert.equal(await enrollFace(imageDataUrl, 'subject-1'), 'enrollment-1');
  assert.equal(await verifyFace(imageDataUrl), 'enrollment-1');
  assert.equal(await verifyFace(imageDataUrl, 'enrollment-1'), true);
  assert.deepEqual(
    calls.map((call) => new URL(call.url).pathname),
    ['/enroll', '/match', '/verify']
  );
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-secret');
});

test('does not match images without explicit liveness and match approval', async () => {
  configureProvider();
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ matched: true, enrollmentId: 'enrollment-1', liveness: 'failed' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  assert.equal(await verifyFace(imageDataUrl), null);
  assert.equal(await verifyFace(imageDataUrl, 'enrollment-1'), false);
});

test('rejects invalid image input before calling a provider', async () => {
  configureProvider();
  globalThis.fetch = async () => {
    throw new Error('Provider must not be called for invalid input');
  };
  await assert.rejects(enrollFace('not-an-image', 'subject-1'), { status: 400 });
});

test('deletes enrollment metadata only through the provider API', async () => {
  configureProvider();
  let calledUrl = '';
  globalThis.fetch = async (url, options) => {
    calledUrl = `${options.method} ${url}`;
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  await deleteFaceEnrollment('enrollment-1');
  assert.equal(calledUrl, 'DELETE https://face.example.test/enroll/enrollment-1');
});
