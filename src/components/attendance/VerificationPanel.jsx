import React, { useState } from 'react';
import { MapPin, Camera, ShieldAlert, CheckCircle2, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext.jsx';

export default function VerificationPanel({
  locationVerified,
  setLocationVerified,
  cameraVerified,
  setCameraVerified,
}) {
  const { officeRules } = useOrganization();
  const [testingGps, setTestingGps] = useState(false);
  const [testingCamera, setTestingCamera] = useState(false);

  const isGeofenceConfigured = Boolean(
    officeRules?.latitude && officeRules?.longitude && officeRules?.radiusMeters
  );

  const handleSimulateLocation = () => {
    setTestingGps(true);
    setTimeout(() => {
      setTestingGps(false);
      setLocationVerified(true);
    }, 700);
  };

  const handleSimulateCamera = () => {
    setTestingCamera(true);
    setTimeout(() => {
      setTestingCamera(false);
      setCameraVerified(true);
    }, 700);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Attendance Verification (Optional Integration)
          </h4>
        </div>
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
          Frontend Prototype
        </span>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Enterprise geofencing and facial recognition verification placeholders. In production, these integrate with browser Geolocation and MediaStreams verified cryptographically against organization security rules.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Location Verification Card */}
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
              {locationVerified ? 'Coordinates matched office geofence' : 'Test location match'}
            </span>
            <button
              type="button"
              onClick={handleSimulateLocation}
              disabled={testingGps || locationVerified}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
            >
              {testingGps && <RefreshCw className="w-3 h-3 animate-spin" />}
              {locationVerified ? 'Simulated' : 'Simulate GPS Match'}
            </button>
          </div>
        </div>

        {/* Camera Verification Card */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-white border border-slate-200 text-violet-600 shadow-2xs">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-900 block">Facial Recognition</span>
                <span className="text-[11px] text-slate-500">Liveness & biometric snapshot</span>
              </div>
            </div>
            {cameraVerified ? (
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
              {cameraVerified ? 'Biometric preview approved' : 'Test selfie check'}
            </span>
            <button
              type="button"
              onClick={handleSimulateCamera}
              disabled={testingCamera || cameraVerified}
              className="text-xs font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
            >
              {testingCamera && <RefreshCw className="w-3 h-3 animate-spin" />}
              {cameraVerified ? 'Simulated' : 'Simulate Face Match'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 text-[11px] text-indigo-900">
        <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
        <p>
          No camera or location hardware access is automatically initiated on page load. All check-in timestamps operate reliably via browser session clocks without requiring verification hardware.
        </p>
      </div>
    </div>
  );
}
