const providerName =
  import.meta.env.VITE_FACE_VERIFICATION_PROVIDER ||
  import.meta.env.VITE_FACE_PROVIDER ||
  'not-configured';

export function getFaceVerificationStatus() {
  const configured = Boolean(
    providerName && providerName !== 'none' && providerName !== 'disabled' && providerName !== 'not-configured'
  );

  if (!configured) {
    return {
      configured: false,
      provider: 'not-configured',
      status: 'disabled',
      message:
        'Face verification is not configured for this deployment. Configure a trusted server-side face verification provider before enabling biometric login or attendance.',
    };
  }

  return {
    configured: true,
    provider: providerName,
    status: 'ready',
    message: `Face verification is configured for ${providerName}.`,
  };
}

export async function requestCameraAccess() {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error('This browser does not support camera access for face verification.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });

  return stream;
}

export function captureFrameFromVideo(videoElement) {
  if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
    throw new Error('A live camera frame is required before capturing biometric input.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to read the current video frame for face verification.');
  }

  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export async function verifyFace({ userId, userRole, operation, imageDataUrl }) {
  const status = getFaceVerificationStatus();

  if (!status.configured) {
    return {
      success: false,
      status: 'not_configured',
      error:
        'Face verification is not configured. Please sign in using your registered account or contact an authorized Admin/HR to complete registration and enrollment.',
    };
  }

  if (!userId || !userRole || !imageDataUrl) {
    return {
      success: false,
      status: 'invalid_request',
      error: 'Face verification requires a verified account and a valid live camera frame.',
    };
  }

  try {
    const response = await fetch('/api/v1/face/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        userId,
        userRole,
        operation,
        imageDataUrl,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message =
        payload?.message ||
        'Face verification failed. Please sign in using your registered account or complete account registration with an authorized administrator.';

      return {
        success: false,
        status: response.status === 401 ? 'unauthorized' : 'verification_failed',
        error: message,
      };
    }

    const payload = await response.json().catch(() => ({ success: true }));
    return {
      success: Boolean(payload?.success ?? true),
      status: payload?.status || 'verified',
      result: payload,
    };
  } catch (error) {
    return {
      success: false,
      status: 'unavailable',
      error:
        'The face verification service is unavailable right now. Please use your registered credentials or try again later.',
    };
  }
}

export async function enrollFace({ userId, userRole, imageDataUrl, consentGranted }) {
  const status = getFaceVerificationStatus();

  if (!status.configured) {
    return {
      success: false,
      status: 'not_configured',
      error:
        'Face enrollment is disabled because no secure verification provider is configured for this deployment.',
    };
  }

  if (!consentGranted) {
    return {
      success: false,
      status: 'consent_required',
      error: 'Informed consent is required before collecting or processing facial data.',
    };
  }

  if (!userId || !userRole || !imageDataUrl) {
    return {
      success: false,
      status: 'invalid_request',
      error: 'Face enrollment requires a verified account and a live camera frame.',
    };
  }

  try {
    const response = await fetch('/api/v1/face/enroll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        userId,
        userRole,
        imageDataUrl,
        consentGranted,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      return {
        success: false,
        status: response.status === 401 ? 'unauthorized' : 'enrollment_failed',
        error:
          payload?.message ||
          'Face enrollment could not be completed. Please confirm your identity and try again.',
      };
    }

    const payload = await response.json().catch(() => ({ success: true }));
    return {
      success: Boolean(payload?.success ?? true),
      status: payload?.status || 'enrolled',
      result: payload,
    };
  } catch (error) {
    return {
      success: false,
      status: 'unavailable',
      error:
        'The face enrollment service is unavailable right now. Please try again later or use your standard sign-in flow.',
    };
  }
}
