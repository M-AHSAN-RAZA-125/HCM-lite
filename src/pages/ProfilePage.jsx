import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../services/apiUrl.js';
import {
  User,
  Mail,
  Shield,
  Building,
  Phone,
  Calendar,
  Key,
  CheckCircle2,
  Camera,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import { useRole } from '../context/RoleContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getFaceVerificationStatus,
  requestCameraAccess,
  captureFrameFromVideo,
  enrollFace,
} from '../services/faceVerification.js';

export default function ProfilePage() {
  const { user, acceptSession, clearSession } = useAuth();
  const currentRole = user?.role || 'EMPLOYEE';
  const navigate = useNavigate();
  const [nameDraft, setNameDraft] = useState(user?.fullName || '');
  const [savingName, setSavingName] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [consentGranted, setConsentGranted] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [faceStatusMessage, setFaceStatusMessage] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [faceEnrollment, setFaceEnrollment] = useState({
    enabled: Boolean(user?.faceEnrolled),
    provider: null,
    updatedAt: null,
  });
  const faceStatus = getFaceVerificationStatus();
  const videoRef = useRef(null);
  const displayName = user?.fullName?.trim() || 'Name not set';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';

  useEffect(() => {
    setNameDraft(user?.fullName || '');
  }, [user?.fullName]);

  const saveFullName = async (event) => {
    event.preventDefault();
    setProfileError('');
    setProfileMessage('');
    setSavingName(true);
    try {
      const response = await fetch(apiUrl('/api/v1/auth/profile'), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: nameDraft }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Your profile could not be updated.');
      if (!payload.user) throw new Error('The server did not return the updated profile.');
      acceptSession(payload.user);
      setProfileMessage('Your name was updated.');
    } catch (error) {
      setProfileError(error.message || 'Your profile could not be updated.');
    } finally {
      setSavingName(false);
    }
  };

  useEffect(() => {
    setFaceEnrollment({
      enabled: Boolean(user?.faceEnrolled),
      provider: null,
      updatedAt: null,
    });
  }, [user?.faceEnrolled]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const openFaceCamera = async () => {
    if (!faceStatus.configured) {
      setFaceStatusMessage('Face enrollment is disabled until a secure provider is configured.');
      return;
    }

    if (!consentGranted) {
      setFaceStatusMessage('Please review and accept the biometric consent before enabling camera access.');
      return;
    }

    setCameraBusy(true);
    try {
      const stream = await requestCameraAccess();
      setCameraStream(stream);
      setCameraOpen(true);
      setFaceStatusMessage('Camera ready. Position your face in the frame and capture the enrollment sample.');
    } catch (error) {
      setFaceStatusMessage(
        error instanceof Error
          ? error.message
          : 'Camera access was denied. Please allow camera permission to continue face enrollment.'
      );
      setCameraOpen(false);
    } finally {
      setCameraBusy(false);
    }
  };

  const handleFaceEnrollment = async () => {
    if (!faceStatus.configured) {
      setFaceStatusMessage('Face enrollment cannot proceed because no secure verification provider is configured.');
      return;
    }

    if (!consentGranted) {
      setFaceStatusMessage('Informed consent is required before collecting or processing biometric data.');
      return;
    }

    if (!videoRef.current) {
      setFaceStatusMessage('Open the camera first before attempting to enroll a face.');
      return;
    }

    setEnrolling(true);

    try {
      const imageDataUrl = captureFrameFromVideo(videoRef.current);
      const result = await enrollFace({
        imageDataUrl,
        consentGranted,
      });

      if (!result.success) {
        setFaceStatusMessage(result.error || 'Face enrollment could not be completed.');
        return;
      }

      const nextState = {
        enabled: true,
        provider: faceStatus.provider,
        updatedAt: new Date().toISOString(),
      };

      setFaceEnrollment(nextState);
      setFaceStatusMessage('The authenticated server confirmed face enrollment.');
      setCameraOpen(false);
      setCameraStream(null);
    } catch (error) {
      setFaceStatusMessage(
        error instanceof Error
          ? error.message
          : 'Face enrollment could not be completed. Please try again after confirming your identity.'
      );
    } finally {
      setEnrolling(false);
    }
  };

  const removeFaceEnrollment = async () => {
    try {
      const response = await fetch(apiUrl('/api/v1/auth/face-enrollment'), {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentWithdrawn: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Face enrollment could not be deleted.');
      setFaceEnrollment({ enabled: false, provider: null, updatedAt: null });
      setConsentGranted(false);
      setFaceStatusMessage('Face enrollment was deleted. Sign-in is disabled until an administrator completes account recovery.');
      setCameraOpen(false);
      cameraStream?.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
      clearSession();
      navigate('/login', { replace: true });
    } catch (error) {
      setFaceStatusMessage(error.message || 'Face enrollment could not be deleted. Please contact your administrator.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile & Credentials"
        subtitle="View and update your personal employee records, job title, and authentication settings."
        breadcrumbs={[{ label: 'Profile' }]}
      />

      {/* Profile Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-sm">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{displayName}</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                {currentRole}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{user?.department || 'Department not provided'}</p>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {user?.email}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right self-stretch sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
          <span className="text-[11px] text-slate-400 block">System Access Level</span>
          <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            {currentRole} Role
          </span>
        </div>
      </div>

      <form onSubmit={saveFullName} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Profile Name</h3>
          <p className="mt-1 text-xs text-slate-500">Update the name shown throughout your authenticated workspace.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1 text-xs font-medium text-slate-700" htmlFor="profile-full-name">
            Full name
            <input
              id="profile-full-name"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              maxLength={120}
              required
              autoComplete="name"
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
          <button
            type="submit"
            disabled={savingName || nameDraft.trim() === (user?.fullName || '')}
            className="self-end rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingName ? 'Saving…' : 'Save Name'}
          </button>
        </div>
        {profileError && <p role="alert" className="text-xs text-rose-700">{profileError}</p>}
        {profileMessage && <p role="status" className="text-xs text-emerald-700">{profileMessage}</p>}
      </form>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Employment Information */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900">Employment Details</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Department</span>
              <span className="font-medium text-slate-800">{user?.department || 'Not provided'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Designation</span>
              <span className="font-medium text-slate-800">{user?.designation || 'Not provided'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Account status</span>
              <span className="font-medium text-slate-800">{user?.status || 'Unknown'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Approval status</span>
              <span className="font-medium text-slate-800">{user?.approvalStatus || 'Not applicable'}</span>
            </div>
          </div>
        </div>

        {/* Security & Authentication */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Key className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900">Security & Credentials</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Authentication Mode</span>
              <span className="font-medium text-slate-800">Secure application session</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Face enrollment</span>
              <span className="font-medium text-slate-800">{user?.faceEnrolled ? 'Enrolled' : 'Not enrolled'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900">Face Enrollment</h3>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-slate-100 text-slate-600">
            {faceEnrollment.enabled ? 'Enrolled' : 'Not Enrolled'}
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Face verification is available only after you confirm your identity with the organization and an authorized backend provider is configured. This enrollment flow requests camera access only after you opt in and never stores raw camera recordings in browser storage.
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
          <label className="flex items-start gap-3 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={consentGranted}
              onChange={(e) => setConsentGranted(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              I understand that my face may be processed by the configured identity verification service for authentication and attendance, and I consent to this processing for the account associated with this profile.
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openFaceCamera}
              disabled={cameraBusy || !faceStatus.configured}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 rounded-lg"
            >
              <Camera className="w-3.5 h-3.5" />
              {cameraBusy ? 'Opening Camera...' : 'Start Enrollment'}
            </button>

            <button
              type="button"
              onClick={handleFaceEnrollment}
              disabled={enrolling || !faceStatus.configured || !cameraOpen}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 active:bg-violet-200 disabled:opacity-50 border border-violet-200 rounded-lg"
            >
              <Shield className="w-3.5 h-3.5" />
              {enrolling ? 'Submitting...' : 'Capture Face Template'}
            </button>

            {faceEnrollment.enabled && (
              <button
                type="button"
                onClick={removeFaceEnrollment}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 active:bg-red-200 border border-red-200 rounded-lg"
              >
                <Lock className="w-3.5 h-3.5" />
                Remove Enrollment
              </button>
            )}
          </div>
        </div>

        {cameraOpen && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-700">Live Camera Preview</span>
              <span className="text-[10px] font-medium text-slate-500">Position your face in the frame</span>
            </div>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full max-h-72 rounded-xl border border-slate-200 bg-slate-900 object-cover"
            />
          </div>
        )}

        {faceStatusMessage && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-[11px] text-indigo-900 leading-relaxed">
            <span className="font-semibold block">Status:</span>
            <span>{faceStatusMessage}</span>
          </div>
        )}

        {!faceStatus.configured && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
            <span>Biometric authentication is disabled because no secure face-verification provider is configured for this environment.</span>
          </div>
        )}
      </div>
    </div>
  );
}
