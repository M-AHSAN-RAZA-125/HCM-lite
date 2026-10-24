async function request(path, body) {
  let response;
  try {
    response = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Authentication service is unavailable. Please try again later.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'The request could not be completed.');
  return payload;
}

export async function getAuthCapabilities() {
  let response;
  try {
    response = await fetch('/api/v1/auth/capabilities', { credentials: 'include', headers: { Accept: 'application/json' } });
  } catch {
    throw new Error('Authentication service is unavailable. Please try again later.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'Could not check face verification availability.');
  return payload;
}

export function signInWithPassword({ email, password, expectedRole }) {
  return request('/api/v1/auth/login', { email, password, expectedRole });
}

export function signInWithFace({ imageDataUrl, expectedRole }) {
  return request('/api/v1/auth/face-login', { imageDataUrl, expectedRole });
}

export function startAccountRecovery({ email, password, expectedRole }) {
  return request('/api/v1/auth/recovery-login', { email, password, expectedRole });
}

export function completeFaceRecovery({ imageDataUrl, consentGranted }) {
  return request('/api/v1/auth/re-enroll', { imageDataUrl, consentGranted });
}

export function prepareRegistrationFaceEnrollment({ email, invitationToken, expectedRole, imageDataUrl, consentGranted }) {
  return request('/api/v1/auth/registration-face-enrollment', {
    email,
    invitationToken,
    expectedRole,
    imageDataUrl,
    consentGranted,
  });
}

export async function registerAccount({
  fullName,
  email,
  password,
  confirmPassword,
  invitationToken,
  expectedRole,
  department,
  designation,
  profilePhoto,
  enrollmentFlowToken,
  consentGranted,
}) {
  let response;
  const formData = new FormData();
  formData.append('fullName', fullName);
  formData.append('email', email);
  formData.append('password', password);
  formData.append('confirmPassword', confirmPassword);
  formData.append('invitationToken', invitationToken);
  formData.append('expectedRole', expectedRole);
  formData.append('department', department);
  formData.append('designation', designation);
  formData.append('profilePhoto', profilePhoto);
  formData.append('enrollmentFlowToken', enrollmentFlowToken);
  formData.append('consentGranted', String(consentGranted));
  try {
    response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
      body: formData,
    });
  } catch {
    throw new Error('Authentication service is unavailable. Please try again later.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'The request could not be completed.');
  return payload;
}

export async function signOut() {
  const response = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'Could not end the session.');
  }
}
