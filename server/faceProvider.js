const CONSENT_VERSION = '2026-10-25';

export class FaceProviderError extends Error {
  constructor(message = 'Face verification is unavailable. Please use email and password or try again later.') {
    super(message);
    this.status = 503;
  }
}

function getProviderConfig() {
  const baseUrl = process.env.FACE_VERIFICATION_PROVIDER_URL;
  const apiKey = process.env.FACE_VERIFICATION_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new FaceProviderError('Face verification provider is not configured. Please contact your administrator.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new FaceProviderError();
  }
  if (parsedUrl.protocol !== 'https:' && process.env.NODE_ENV !== 'development') {
    throw new FaceProviderError();
  }

  return { baseUrl: parsedUrl.toString().replace(/\/$/, ''), apiKey };
}

function validateImage(imageDataUrl) {
  return (
    typeof imageDataUrl === 'string' &&
    imageDataUrl.length <= 5_500_000 &&
    /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(imageDataUrl)
  );
}

async function callProvider(path, { method = 'POST', body } = {}) {
  const { baseUrl, apiKey } = getProviderConfig();
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new FaceProviderError();
  }

  if (!response.ok) throw new FaceProviderError();
  try {
    return await response.json();
  } catch {
    throw new FaceProviderError();
  }
}

export function isFaceProviderConfigured() {
  return Boolean(process.env.FACE_VERIFICATION_PROVIDER_URL && process.env.FACE_VERIFICATION_API_KEY);
}

export async function enrollFace(imageDataUrl, subjectId) {
  if (!validateImage(imageDataUrl)) {
    const error = new Error('A valid live camera image is required for face enrollment.');
    error.status = 400;
    throw error;
  }

  const result = await callProvider('/enroll', { body: { imageDataUrl, subjectId } });
  if (
    result?.success !== true ||
    result?.liveness !== 'passed' ||
    typeof result?.enrollmentId !== 'string' ||
    !result.enrollmentId.trim()
  ) {
    const error = new Error('Face enrollment or liveness verification failed. Please try again.');
    error.status = 422;
    throw error;
  }
  return result.enrollmentId.trim();
}

export async function verifyFace(imageDataUrl, enrollmentId = null) {
  if (!validateImage(imageDataUrl)) {
    const error = new Error('A valid live camera image is required for face verification.');
    error.status = 400;
    throw error;
  }
  const result = await callProvider(enrollmentId ? '/verify' : '/match', {
    body: { imageDataUrl, ...(enrollmentId ? { enrollmentId } : {}) },
  });
  if (result?.matched !== true || result?.liveness !== 'passed') return null;
  if (enrollmentId) return true;
  return typeof result?.enrollmentId === 'string' && result.enrollmentId.trim()
    ? result.enrollmentId.trim()
    : null;
}

export async function deleteFaceEnrollment(enrollmentId) {
  const encodedId = encodeURIComponent(enrollmentId);
  const result = await callProvider(`/enroll/${encodedId}`, { method: 'DELETE' });
  if (result?.success !== true) throw new FaceProviderError();
}

export { CONSENT_VERSION };
