import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import BrandLogo from '../components/common/BrandLogo.jsx';
import { requestCameraAccess, captureFrameFromVideo } from '../services/faceVerification.js';
import {
  completeFaceRecovery,
  getAuthCapabilities,
  prepareRegistrationFaceEnrollment,
  registerAccount,
  signInWithFace,
  signInWithPassword,
  startAccountRecovery,
} from '../services/authApi.js';

const roleByRoute = { employee: 'EMPLOYEE', hr: 'HR', admin: 'ADMIN' };
const roleLabels = { EMPLOYEE: 'Employee', HR: 'HR', ADMIN: 'Admin' };
const roleDescriptions = {
  EMPLOYEE: 'Sign in to your employee workspace.',
  HR: 'Sign in to your HR workspace.',
  ADMIN: 'Sign in to your administrator workspace.',
};

export default function AuthenticationPage() {
  const { role: routeRole } = useParams();
  const expectedRole = roleByRoute[routeRole?.toLowerCase()];
  const navigate = useNavigate();
  const { acceptSession, authNotice } = useAuth();
  const videoRef = useRef(null);
  const [tab, setTab] = useState('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationToken, setInvitationToken] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const [enrollmentFlowToken, setEnrollmentFlowToken] = useState('');
  const [faceEnrollmentComplete, setFaceEnrollmentComplete] = useState(false);
  const [consentGranted, setConsentGranted] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraPurpose, setCameraPurpose] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profilePhoto) {
      setProfilePhotoPreview('');
      return undefined;
    }
    const previewUrl = URL.createObjectURL(profilePhoto);
    setProfilePhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [profilePhoto]);

  useEffect(() => {
    if (!cameraOpen || !cameraStream || !videoRef.current) return undefined;
    const video = videoRef.current;
    video.srcObject = cameraStream;
    video.play().catch(() => {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
      setCameraOpen(false);
      setCameraError('Camera preview could not start. Check browser camera permissions and try again.');
    });
    return () => {
      video.srcObject = null;
      cameraStream.getTracks().forEach((track) => track.stop());
    };
  }, [cameraOpen, cameraStream]);

  useEffect(
    () => () => cameraStream?.getTracks().forEach((track) => track.stop()),
    [cameraStream]
  );

  if (!expectedRole) return <Navigate to="/login" replace />;

  const openCamera = async (purpose) => {
    setError('');
    setSuccessMessage('');
    setCameraError('');
    setCameraPurpose(purpose);
    try {
      const stream = await requestCameraAccess();
      setCameraStream(stream);
      setCameraOpen(true);
    } catch (cameraAccessError) {
      const message = cameraAccessError instanceof Error
        ? cameraAccessError.message
        : 'Camera access was denied. Allow camera access or use email and password.';
      if (purpose === 'login') setError('Face verification failed. Please try again or sign in using your email and password.');
      else setCameraError(message);
    }
  };

  const closeCamera = () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setCameraOpen(false);
    setCameraPurpose(null);
    setCameraError('');
  };

  const onPasswordSignIn = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setBusy(true);
    try {
      const result = await signInWithPassword({ email, password, expectedRole });
      acceptSession(result.user);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const onStartRegistration = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!fullName.trim() || !email.trim()) {
      setError('Enter your full name and email address to continue.');
      return;
    }
    if (password.length < 12) {
      setError('Use a password with at least 12 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    if (!invitationToken.trim()) {
      setError('Registration requires an invitation from an authorized administrator.');
      return;
    }
    if (!consentGranted) {
      setError('Review and accept the biometric data notice before continuing.');
      return;
    }
    if (!profilePhoto) {
      setError('Upload a valid profile photo before submitting your registration.');
      return;
    }
    if (!faceEnrollmentComplete || !enrollmentFlowToken) {
      setError('Complete face enrollment using the Start Face Enrollment button before submitting.');
      return;
    }
    setBusy(true);
    try {
      const result = await registerAccount({
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
      });
      setSuccessMessage(result.message);
      setTab('signin');
      setPassword('');
      setConfirmPassword('');
      setProfilePhoto(null);
      setEnrollmentFlowToken('');
      setFaceEnrollmentComplete(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const onStartFaceEnrollment = async () => {
    setError('');
    setSuccessMessage('');
    setCameraError('');
    if (!email.trim() || !invitationToken.trim()) {
      setError('Enter your email address and administrator invitation before face enrollment.');
      return;
    }
    if (!profilePhoto) {
      setError('Upload a valid profile photo before starting face enrollment.');
      return;
    }
    if (!consentGranted) {
      setError('Accept the biometric consent notice before starting face enrollment.');
      return;
    }
    setBusy(true);
    try {
      const capabilities = await getAuthCapabilities();
      if (!capabilities.faceConfigured) {
        throw new Error('Face verification provider is not configured. Please contact your administrator.');
      }
    } catch (requestError) {
      setError(requestError.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    setFaceEnrollmentComplete(false);
    setEnrollmentFlowToken('');
    await openCamera('signup-enrollment');
  };

  const onStartFaceSignIn = async () => {
    setError('');
    setBusy(true);
    try {
      const capabilities = await getAuthCapabilities();
      if (!capabilities.faceConfigured) {
        throw new Error('Face verification provider is not configured. Please contact your administrator.');
      }
      await openCamera('login');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const onProfilePhotoChange = (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';
    setFaceEnrollmentComplete(false);
    setEnrollmentFlowToken('');
    if (!selectedFile) return;
    if (!['image/jpeg', 'image/png'].includes(selectedFile.type)) {
      setProfilePhoto(null);
      setError('Profile photo must be a JPG, JPEG, or PNG image.');
      return;
    }
    if (selectedFile.size === 0 || selectedFile.size > 2 * 1024 * 1024) {
      setProfilePhoto(null);
      setError('Profile photo must be a valid image no larger than 2 MB.');
      return;
    }
    setError('');
    setProfilePhoto(selectedFile);
  };

  const onCapture = async () => {
    if (!videoRef.current || !cameraPurpose) return;
    const purpose = cameraPurpose;
    setBusy(true);
    setError('');
    setCameraError('');
    try {
      const imageDataUrl = captureFrameFromVideo(videoRef.current);
      if (purpose === 'signup-enrollment') {
        const result = await prepareRegistrationFaceEnrollment({
          email,
          invitationToken,
          expectedRole,
          imageDataUrl,
          consentGranted,
        });
        setEnrollmentFlowToken(result.flowToken);
        setFaceEnrollmentComplete(true);
        closeCamera();
      } else if (purpose === 'recovery') {
        await startAccountRecovery({ email, password, expectedRole });
        const result = await completeFaceRecovery({ imageDataUrl, consentGranted });
        acceptSession(result.user);
        closeCamera();
        navigate('/dashboard', { replace: true });
      } else {
        const result = await signInWithFace({ imageDataUrl, expectedRole });
        acceptSession(result.user);
        closeCamera();
        navigate('/dashboard', { replace: true });
      }
    } catch (requestError) {
      if (purpose === 'signup-enrollment') {
        setFaceEnrollmentComplete(false);
        setEnrollmentFlowToken('');
        const message = requestError.message || 'Face enrollment failed. Please try again.';
        closeCamera();
        setCameraError(message);
      } else if (purpose === 'login') {
        closeCamera();
        setCameraError(requestError.message || 'Face verification failed. Please try again or sign in using your email and password.');
      } else {
        const message = requestError.message || 'Verification failed. Please try again.';
        closeCamera();
        setCameraError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 lg:grid lg:grid-cols-2">
        <section className="hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="medium" className="rounded-lg bg-white p-0.5" />
            <div>
              <div className="font-bold">HCM Lite</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-indigo-300">Workforce Cloud</div>
            </div>
          </div>
          <div className="py-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">Secure access</p>
            <h1 className="mt-4 text-3xl font-bold leading-tight">People operations, together.</h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Password and biometric sign-in are checked by the HCM Lite server. Your selected role never grants account permissions.
            </p>
            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-slate-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
              A valid administrator invitation and successful face enrollment are required to create an account.
            </div>
          </div>
          <p className="text-xs text-slate-500">HCM Lite &middot; Secure sign-in</p>
        </section>

        <section className="p-5 sm:p-8 lg:p-10">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Change account type
          </Link>

          <div className="mt-7">
            <BrandLogo size="form" className="mb-4 rounded-lg bg-white p-0.5" />
            {authNotice && (
              <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {authNotice}
              </p>
            )}
            <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {roleLabels[expectedRole]} account
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
              {tab === 'signin' ? 'Welcome back' : tab === 'signup' ? 'Create your account' : 'Recover face access'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {tab === 'signin'
                ? roleDescriptions[expectedRole]
                : tab === 'signup'
                  ? 'Complete your authorized registration and required face enrollment.'
                  : 'Verify your password and complete a new face enrollment to restore access.'}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Authentication options">
            {[
              ['signin', 'Sign In'],
              ['signup', 'Sign Up'],
              ['recovery', 'Recovery'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => {
                  setTab(value);
                  setError('');
                  setSuccessMessage('');
                }}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  tab === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {error}
            </p>
          )}
          {successMessage && (
            <p className="mt-4 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {successMessage}
            </p>
          )}

          {tab === 'signin' ? (
            <form onSubmit={onPasswordSignIn} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700" htmlFor="email">
                Email address
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  placeholder="name@company.com"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700" htmlFor="password">
                Password
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  placeholder="Your password"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Sign In with Email and Password
              </button>
              <div className="flex items-center gap-3 py-1 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={onStartFaceSignIn}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800 transition hover:bg-violet-100 disabled:opacity-60"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
                Sign In with Face
              </button>
              <p className="text-center text-xs leading-relaxed text-slate-500">
                The camera starts only after you choose face sign-in. Face verification is handled by the configured server-side provider.
              </p>
            </form>
          ) : tab === 'signup' ? (
            <form onSubmit={onStartRegistration} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700" htmlFor="fullName">
                Full name
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={120}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700" htmlFor="signupEmail">
                Email address
                <input
                  id="signupEmail"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEnrollmentFlowToken('');
                    setFaceEnrollmentComplete(false);
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700" htmlFor="invite">
                Administrator invitation code
                <input
                  id="invite"
                  type="text"
                  required
                  autoComplete="off"
                  value={invitationToken}
                  onChange={(event) => {
                    setInvitationToken(event.target.value);
                    setEnrollmentFlowToken('');
                    setFaceEnrollmentComplete(false);
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  placeholder="Provided by your organization"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700" htmlFor="department">
                  Department <span className="font-normal text-slate-400">(optional)</span>
                  <input
                    id="department"
                    type="text"
                    maxLength={120}
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700" htmlFor="designation">
                  Designation <span className="font-normal text-slate-400">(optional)</span>
                  <input
                    id="designation"
                    type="text"
                    maxLength={120}
                    value={designation}
                    onChange={(event) => setDesignation(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </label>
              </div>
              <section className="rounded-2xl border border-slate-200 p-4" aria-labelledby="photo-title">
                <div>
                  <h3 id="photo-title" className="text-sm font-semibold text-slate-900">Profile Photo</h3>
                  <p className="mt-1 text-xs text-slate-500">Choose a JPG or PNG image up to 2 MB. This is separate from face enrollment.</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  {profilePhotoPreview && (
                    <img src={profilePhotoPreview} alt="Profile photo preview" className="h-20 w-20 rounded-xl border border-slate-200 object-cover" />
                  )}
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      <Upload className="h-4 w-4" aria-hidden="true" />
                      {profilePhoto ? 'Replace photo' : 'Upload Profile Photo'}
                      <input className="sr-only" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={onProfilePhotoChange} />
                    </label>
                    {profilePhoto && (
                      <button type="button" onClick={() => {
                        setProfilePhoto(null);
                        setEnrollmentFlowToken('');
                        setFaceEnrollmentComplete(false);
                      }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                        <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
                      </button>
                    )}
                  </div>
                </div>
                {profilePhoto && <p className="mt-2 truncate text-xs text-emerald-700" role="status">{profilePhoto.name} selected</p>}
              </section>
              <section className="rounded-2xl border border-slate-200 p-4" aria-labelledby="enrollment-title">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 id="enrollment-title" className="text-sm font-semibold text-slate-900">Face Enrollment</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">The camera starts only after you choose the enrollment button. A configured face provider is required.</p>
                  </div>
                  {faceEnrollmentComplete && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Face enrollment complete" />}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onStartFaceEnrollment}
                  className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${faceEnrollmentComplete ? 'border border-emerald-200 bg-emerald-50 text-emerald-800' : 'border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100'}`}
                >
                  {faceEnrollmentComplete ? <CheckCircle2 className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                  {faceEnrollmentComplete ? 'Face Enrollment Complete — Retry' : 'Start Face Enrollment'}
                </button>
                {!faceEnrollmentComplete && <p className="mt-2 text-xs text-slate-500">Keep your face centered and well lit during enrollment.</p>}
              </section>
              <label className="block text-sm font-medium text-slate-700" htmlFor="newPassword">
                Password
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700" htmlFor="confirmPassword">
                Confirm password
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                <input
                  type="checkbox"
                  checked={consentGranted}
                  onChange={(event) => setConsentGranted(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-indigo-600"
                />
                <span>
                  I consent to face data processing for sign-in and attendance. Images are sent to the configured verification provider for processing; the application stores only its enrollment reference and consent record. I can withdraw consent by contacting an authorized administrator; I understand that this disables sign-in until an authorized recovery is completed.
                </span>
              </label>
              {faceEnrollmentComplete && (
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700" role="status">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Face enrollment completed securely.
                </p>
              )}
              <button
                type="submit"
                disabled={busy || !profilePhoto || !faceEnrollmentComplete}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                Submit Registration Request
              </button>
              <p className="text-xs leading-relaxed text-slate-500">
                Registration is invitation-only. Your account remains pending until an authorized HR or Admin approves the request.
              </p>
            </form>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setError('');
                if (!email.trim() || !password) {
                  setError('Enter your registered email and password to continue recovery.');
                  return;
                }
                if (!consentGranted) {
                  setError('Consent is required before processing a new face enrollment.');
                  return;
                }
                openCamera('recovery');
              }}
              className="mt-5 space-y-4"
            >
              <label className="block text-sm font-medium text-slate-700" htmlFor="recoveryEmail">
                Registered email address
                <input
                  id="recoveryEmail"
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700" htmlFor="recoveryPassword">
                Account password
                <input
                  id="recoveryPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                <input
                  type="checkbox"
                  checked={consentGranted}
                  onChange={(event) => setConsentGranted(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-indigo-600"
                />
                <span>I consent to processing this new face enrollment to restore access to my existing account.</span>
              </label>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700">
                Continue to Face Recovery
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <p className="text-xs leading-relaxed text-slate-500">
                Recovery verifies your password, limits the session to enrollment, and restores normal access only after successful provider verification.
              </p>
            </form>
          )}
        </section>
      </div>

      {cameraError && !cameraOpen && (
        <p className="fixed bottom-4 left-4 right-4 mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 shadow" role="alert">
          {cameraError}
        </p>
      )}

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4" role="dialog" aria-modal="true" aria-labelledby="camera-title">
          <section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="camera-title" className="text-lg font-bold text-slate-900">
                  {cameraPurpose === 'signup-enrollment'
                    ? 'Mandatory face registration'
                    : cameraPurpose === 'recovery'
                      ? 'Recover face access'
                      : 'Sign in with your face'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Position your face in the center of the camera view.</p>
              </div>
              <button type="button" onClick={closeCamera} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cancel camera flow">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl bg-slate-950">
              <video ref={videoRef} className="aspect-video w-full object-cover" autoPlay muted playsInline aria-label="Live camera preview" />
            </div>
            {cameraError && <p className="mt-3 text-sm text-red-700" role="alert">{cameraError}</p>}
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeCamera} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                Cancel
              </button>
              <button type="button" onClick={onCapture} disabled={busy || !cameraStream} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {busy
                  ? 'Verifying securely…'
                  : cameraPurpose === 'signup-enrollment'
                    ? 'Capture & Enroll Face'
                    : cameraPurpose === 'recovery'
                      ? 'Verify & Restore Access'
                      : 'Verify & Sign In'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
