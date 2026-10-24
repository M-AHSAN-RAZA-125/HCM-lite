import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['EMPLOYEE', 'HR', 'ADMIN'], required: true, immutable: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'INACTIVE'],
      default: 'PENDING',
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    organizationId: { type: String, required: true, default: 'default', index: true },
    department: { type: String, trim: true, maxlength: 120, default: '' },
    designation: { type: String, trim: true, maxlength: 120, default: '' },
    profilePhotoId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProfilePhoto', select: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedByRole: { type: String, enum: ['HR', 'ADMIN', null], default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectedByRole: { type: String, enum: ['HR', 'ADMIN', null], default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, maxlength: 500, default: '' },
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
    organizationId: { type: String, required: true, default: 'default', index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const profilePhotoSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    contentType: { type: String, enum: ['image/jpeg', 'image/png'], required: true },
    data: { type: Buffer, required: true, select: false },
  },
  { timestamps: true }
);

const enrollmentAttemptSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['EMPLOYEE', 'HR', 'ADMIN'], required: true },
    organizationId: { type: String, required: true },
    invitationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invitation', required: true },
    invitationTokenHash: { type: String, required: true, select: false },
    flowTokenHash: { type: String, required: true, unique: true, select: false },
    providerEnrollmentId: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: String, required: true },
    type: {
      type: String,
      enum: ['EMPLOYEE_REGISTRATION_REQUEST', 'EMPLOYEE_REGISTRATION_DECISION'],
      required: true,
    },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 500 },
    relatedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    link: { type: String, default: '/employee-approvals' },
    isRead: { type: Boolean, default: false },
    dismissedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
notificationSchema.index({ recipientId: 1, dismissedAt: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1, dismissedAt: 1 });

const auditEventSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorRole: { type: String, enum: ['EMPLOYEE', 'HR', 'ADMIN', 'SYSTEM'], required: true },
    action: { type: String, required: true, maxlength: 80 },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: String, required: true },
    occurredAt: { type: Date, default: Date.now },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { versionKey: false }
);
auditEventSchema.index({ organizationId: 1, occurredAt: -1 });

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
export const ProfilePhoto = mongoose.models.ProfilePhoto || mongoose.model('ProfilePhoto', profilePhotoSchema);
export const EnrollmentAttempt =
  mongoose.models.EnrollmentAttempt || mongoose.model('EnrollmentAttempt', enrollmentAttemptSchema);
export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export const AuditEvent = mongoose.models.AuditEvent || mongoose.model('AuditEvent', auditEventSchema);
export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
export const SystemState =
  mongoose.models.SystemState ||
  mongoose.model(
    'SystemState',
    new mongoose.Schema({ _id: String, createdAt: { type: Date, default: Date.now } }, { versionKey: false })
  );
