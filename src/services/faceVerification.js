const providerName =
  import.meta.env.VITE_FACE_VERIFICATION_PROVIDER ||
  import.meta.env.VITE_FACE_PROVIDER ||
  'not-configured';

export function getFaceVerificationStatus() {
  const configured = Boolean(
    providerName && providerName !== 'none' && providerName !== 'disabled' && providerName !== 'not-configured'
  );
  return {
    configured,
    provider: configured ? providerName : 'not-configured',
    status: configured ? 'ready' : 'disabled',
    message: configured
      ? 'Face verification is routed through the configured server-side provider.'
      : 'Face verification is unavailable until a server-side provider is configured.',
  };
}

export async function requestCameraAccess() {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error('This browser does not support camera access. Use email and password instead.');
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch (error) {
    if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
      throw new Error('Camera permission was denied. Allow camera access or use email and password.');
    }
    if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
      throw new Error('No camera is available. Use email and password instead.');
    }
    throw new Error('Camera access failed. Check your camera connection and browser permissions.');
  }
}

export function captureFrameFromVideo(videoElement) {
  if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
    throw new Error('A live camera frame is required before continuing.');
  }
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to capture the live camera frame.');
  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

async function sendFaceRequest(path, body) {
  let response;
  try {
    response = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { success: false, status: 'unavailable', error: 'The verification service is unavailable. Please try again later.' };
  }
  const payload = await response.json().catch(() => ({}));
  return response.ok
    ? { success: true, status: payload.status || 'verified', result: payload }
    : {
        success: false,
        status: response.status === 503 ? 'not_configured' : 'verification_failed',
        error: payload.message || 'Face verification failed. Try again or use email and password.',
      };
}

export function verifyFace({ operation, imageDataUrl }) {
  return sendFaceRequest('/api/v1/attendance/face', { action: operation, imageDataUrl });
}

export function enrollFace({ imageDataUrl, consentGranted }) {
  return sendFaceRequest('/api/v1/auth/face-enrollment', { imageDataUrl, consentGranted });
}
