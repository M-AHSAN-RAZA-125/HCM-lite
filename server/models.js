import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['EMPLOYEE', 'HR', 'ADMIN'], required: true, immutable: true },
    status: { type: String, enum: ['PENDING', 'ACTIVE', 'INACTIVE'], default: 'PENDING', index: true },
    faceEnrollment: {
      status: { type: String, enum: ['INCOMPLETE', 'ENROLLED'], default: 'INCOMPLETE' },
      providerEnrollmentId: { type: String, select: false },
      consentGivenAt: { type: Date },
      consentVersion: { type: String },
    },
  },
  { timestamps: true }
);
userSchema.index(
  { 'faceEnrollment.providerEnrollmentId': 1 },
  { unique: true, sparse: true }
);

const invitationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ['EMPLOYEE', 'HR', 'ADMIN'], required: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dayKey: { type: String, required: true },
    checkInAt: { type: Date, required: true },
    checkOutAt: { type: Date, default: null },
    source: { type: String, enum: ['face'], default: 'face' },
  },
  { timestamps: true }
);
attendanceSchema.index({ userId: 1, dayKey: 1 }, { unique: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Invitation = mongoose.models.Invitation || mongoose.model('Invitation', invitationSchema);
export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
export const SystemState =
  mongoose.models.SystemState ||
  mongoose.model(
    'SystemState',
    new mongoose.Schema({ _id: String, createdAt: { type: Date, default: Date.now } }, { versionKey: false })
  );
