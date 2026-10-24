import React from 'react';
import { MapPin, Camera, ShieldAlert, CheckCircle2, Info, Lock } from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { getFaceVerificationStatus } from '../../services/faceVerification.js';

export default function VerificationPanel({
  locationVerified,
  setLocationVerified,
  cameraVerified,
  setCameraVerified,
}) {
  const { officeRules } = useOrganization();
  const faceStatus = getFaceVerificationStatus();
  const isGeofenceConfigured = Boolean(
    officeRules?.latitude && officeRules?.longitude && officeRules?.radiusMeters
  );

  const handleLocationSimulation = () => {
    setLocationVerified(true);
  };

  const handleCameraEnablement = () => {
    if (!faceStatus.configured) {
      setCameraVerified(false);
      return;
    }
    setCameraVerified(true);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Secure Verification Status
          </h4>
        </div>
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
          {faceStatus.configured ? 'Provider Ready' : 'Not Configured'}
        </span>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Face verification is an authenticated server-side integration. This deployment does not simulate biometric matches or auto-approve any user. A trusted provider must be configured before a live face verification can be used for login or attendance.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-white border border-slate-200 text-indigo-600 shadow-2xs">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-900 block">GPS Geofencing</span>
                <span className="text-[11px] text-slate-500">
                  {isGeofenceConfigured
                    ? `${officeRules.locationName || 'Main Office'} (Radius: ${officeRules.radiusMeters}m)`
                    : 'Office radius not configured in Organization Setup'}
                </span>
              </div>
            </div>
            {locationVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                Optional
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
            <span className="text-[10px] text-slate-400">
              {locationVerified ? 'Coordinates matched the configured office geofence.' : 'Geofence verification remains optional until configured.'}
            </span>
            <button
              type="button"
              onClick={handleLocationSimulation}
              disabled={locationVerified}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
            >
              {locationVerified ? 'Verified' : 'Verify Location'}
            </button>
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-white border border-slate-200 text-violet-600 shadow-2xs">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-900 block">Face Recognition</span>
                <span className="text-[11px] text-slate-500">Requires a secure provider</span>
              </div>
            </div>
            {cameraVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                {faceStatus.configured ? 'Ready' : 'Disabled'}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
            <span className="text-[10px] text-slate-400">
              {faceStatus.configured
                ? 'A provider is configured for server-side verification.'
                : 'No trusted face-verification backend is configured for this environment.'}
            </span>
            <button
              type="button"
              onClick={handleCameraEnablement}
              disabled={!faceStatus.configured || cameraVerified}
              className="text-xs font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
            >
              {cameraVerified ? 'Verified' : faceStatus.configured ? 'Enable Face Auth' : 'Unavailable'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 text-[11px] text-indigo-900">
        <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
        <p>
          {faceStatus.configured
            ? `Current provider: ${faceStatus.provider}. Face verification requests must be validated by the backend before any account session or attendance record is created.`
            : 'Face verification is intentionally disabled until a secure provider is configured. No camera access is requested and no biometric match is approved automatically.'}
        </p>
      </div>

      {!faceStatus.configured && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
          <Lock className="w-3.5 h-3.5 text-amber-700" />
          <span>Biometric enrollment and matching remain disabled until a server-side verification provider is configured.</span>
        </div>
      )}
    </div>
  );
}
