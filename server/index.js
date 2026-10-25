import 'dotenv/config';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import multer from 'multer';
import { registerFrontendFallback } from './frontendFallback.js';
import { buildDashboardData } from './dashboardData.js';
import {
  Attendance,
  AuditEvent,
  EnrollmentAttempt,
  Invitation,
  Notification,
  ProfilePhoto,
  SystemState,
  User,
} from './models.js';
import {
  CONSENT_VERSION,
  deleteFaceEnrollment,
  enrollFace,
  isFaceProviderConfigured,
  verifyFace,
} from './faceProvider.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const validRoles = new Set(['EMPLOYEE', 'HR', 'ADMIN']);
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI must be configured before starting the API server.');
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 characters.');
}
if (!process.env.APP_ORIGIN) throw new Error('APP_ORIGIN must be configured to protect authenticated requests.');

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json({ limit: '7mb', type: 'application/json' }));
app.use((req, res, next) => {
  const origin = req.get('origin');
  const allowedOrigin = process.env.APP_ORIGIN;

  if (origin && origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.vary('Origin');
  }

  if (req.method === 'OPTIONS') {
    if (!origin || origin !== allowedOrigin) {
      return res.status(403).json({ message: 'Request origin is not allowed.' });
    }
    return res.status(204).end();
  }

  if (['POST', 'PATCH', 'DELETE'].includes(req.method) && (!origin || origin !== allowedOrigin)) {
    return res.status(403).json({ message: 'Request origin is not allowed.' });
  }
  next();
});
app.use(
  session({
    name: 'hcm.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 60 * 60 * 24 * 7,
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);


const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please wait and try again.' },
});
const faceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many face verification attempts. Please wait and try again.' },
});
const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 12, fieldSize: 6 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) return callback(null, true);
    const error = new Error('Profile photo must be a JPG, JPEG, or PNG image.');
    error.status = 400;
    callback(error);
  },
});

function cleanText(value, maxLength = 120) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function validPassword(password) {
  return typeof password === 'string' && password.length >= 12 && Buffer.byteLength(password, 'utf8') <= 72;
}

function profilePhotoContentType(file) {
  if (!file?.buffer || file.buffer.length === 0 || file.buffer.length > 2 * 1024 * 1024) return null;
  const jpeg =
    file.buffer.length >= 3 &&
    file.buffer[0] === 0xff &&
    file.buffer[1] === 0xd8 &&
    file.buffer[2] === 0xff;
  const png =
    file.buffer.length >= 8 &&
    file.buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (jpeg && file.mimetype === 'image/jpeg') return 'image/jpeg';
  if (png && file.mimetype === 'image/png') return 'image/png';
  return null;
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function tokensMatch(left, right) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function accountStatusError(user) {
  if (user.status === 'REJECTED' || user.approvalStatus === 'REJECTED') {
    return {
      status: 403,
      message: 'Your registration request was not approved. Please contact HR or Admin for assistance.',
    };
  }
  if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
    return { status: 403, message: 'Your account is suspended or inactive. Please contact HR or Admin for assistance.' };
  }
  if (
    user.status === 'PENDING' ||
    user.approvalStatus === 'PENDING' ||
    (user.role === 'EMPLOYEE' && user.approvalStatus !== 'APPROVED')
  ) {
    return { status: 403, message: 'Your account is awaiting HR/Admin approval.' };
  }
  if (user.status !== 'ACTIVE' || (user.role === 'EMPLOYEE' && user.approvalStatus !== 'APPROVED')) {
    return { status: 403, message: 'This account is not approved for sign in. Please contact your administrator.' };
  }
  return null;
}

function pendingEmployeeQuery(organizationId) {
  return {
    organizationId,
    role: 'EMPLOYEE',
    $or: [
      { status: 'PENDING', approvalStatus: 'PENDING' },
      { status: 'ACTIVE', approvalStatus: { $in: ['PENDING', null] } },
    ],
  };
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    approvalStatus: user.approvalStatus,
    department: user.department || '',
    designation: user.designation || '',
    faceEnrolled: user.faceEnrollment?.status === 'ENROLLED',
    profilePhotoUploaded: Boolean(user.profilePhotoId),
  };
}

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ message: 'Please sign in to continue.' });
  next();
}

function requireSessionVerification(req, res, next) {
  if (req.session.userId) return next();
  const hasSessionCookie = (req.get('cookie') || '')
    .split(';')
    .some((cookie) => cookie.trim().startsWith('hcm.sid='));
  return res.status(401).json({
    code: hasSessionCookie ? 'SESSION_EXPIRED' : 'SESSION_REQUIRED',
    message: hasSessionCookie ? 'Your session has expired. Please sign in again.' : 'Please sign in to continue.',
  });
}

async function loadUser(req, res, next) {
  try {
    const user = await User.findById(req.session.userId)
      .select('+faceEnrollment.providerEnrollmentId +profilePhotoId');
    if (!user || accountStatusError(user) || user.faceEnrollment?.status !== 'ENROLLED') {
      req.session.destroy(() => {});
      return res.status(401).json({
        code: 'SESSION_INVALID',
        message: 'This account is not eligible to sign in.',
      });
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.user.role)
      ? next()
      : res.status(403).json({ message: 'You are not authorized to perform this action.' });
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });
}

app.get('/api/v1/auth/capabilities', (_req, res) => {
  res.json({ faceConfigured: isFaceProviderConfigured() });
});

app.get('/api/v1/auth/me', requireSessionVerification, loadUser, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.patch('/api/v1/auth/profile', requireAuth, loadUser, async (req, res, next) => {
  try {
    const keys = Object.keys(req.body || {});
    if (keys.length !== 1 || keys[0] !== 'fullName') {
      return res.status(400).json({ message: 'Only your full name can be updated here.' });
    }
    if (
      typeof req.body.fullName !== 'string' ||
      /[\u0000-\u001f\u007f]/.test(req.body.fullName)
    ) {
      return res.status(400).json({ message: 'Enter a valid full name.' });
    }
    const fullName = req.body.fullName.trim();
    if (fullName.length < 2 || fullName.length > 120) {
      return res.status(400).json({ message: 'Full name must be between 2 and 120 characters.' });
    }
    if (fullName === req.user.fullName) return res.json({ user: publicUser(req.user) });

    const previousName = req.user.fullName;
    req.user.fullName = fullName;
    await req.user.save();
    await AuditEvent.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'profile.full_name_updated',
      targetUserId: req.user._id,
      organizationId: req.user.organizationId,
      details: { previousName, fullName },
    });
    res.json({ user: publicUser(req.user) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/dashboard', requireAuth, loadUser, async (req, res, next) => {
  try {
    const days = Number(req.query.days || 7);
    if (![7, 30].includes(days)) {
      return res.status(400).json({ message: 'Dashboard period must be 7 or 30 days.' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.parse(`${today}T00:00:00.000Z`) - (days - 1) * 24 * 60 * 60 * 1000);
    const startDay = start.toISOString().slice(0, 10);
    let employees = [];
    let requestCounts = {};
    let attendanceQuery;

    if (req.user.role === 'EMPLOYEE') {
      attendanceQuery = { userId: req.user._id };
    } else {
      const organizationFilter = { organizationId: req.user.organizationId, role: 'EMPLOYEE' };
      const [activeEmployees, statuses] = await Promise.all([
        User.find({ ...organizationFilter, status: 'ACTIVE', approvalStatus: 'APPROVED' })
          .select('_id department')
          .lean(),
        User.aggregate([
          { $match: organizationFilter },
          { $group: { _id: '$approvalStatus', count: { $sum: 1 } } },
        ]),
      ]);
      employees = activeEmployees;
      requestCounts = Object.fromEntries(
        statuses.map(({ _id, count }) => [String(_id || '').toLowerCase(), count])
      );
      attendanceQuery = { userId: { $in: activeEmployees.map((employee) => employee._id) } };
    }

    const attendance = await Attendance.find({
      ...attendanceQuery,
      dayKey: { $gte: startDay, $lte: today },
    })
      .select('dayKey checkInAt')
      .sort({ checkInAt: -1 })
      .lean();

    res.json({
      dashboard: buildDashboardData({
        user: req.user,
        employees,
        attendance,
        requestCounts,
        today,
        days,
      }),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/auth/login', authLimiter, async (req, res, next) => {
  try {
    const email = cleanText(req.body?.email, 254).toLowerCase();
    const password = req.body?.password;
    const expectedRole = req.body?.expectedRole;
    if (!validEmail(email) || typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 72 || !validRoles.has(expectedRole)) {
      return res.status(400).json({ message: 'Enter a valid email, password, and selected account type.' });
    }

    const user = await User.findOne({ email }).select('+passwordHash +faceEnrollment.providerEnrollmentId');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    if (user.role !== expectedRole) {
      return res.status(403).json({ message: 'This account type does not match the selected role.' });
    }
    const statusError = accountStatusError(user);
    if (statusError) return res.status(statusError.status).json({ message: statusError.message });
    if (user.faceEnrollment?.status !== 'ENROLLED' || !user.faceEnrollment.providerEnrollmentId) {
      return res.status(403).json({ message: 'Face enrollment is incomplete. Contact your administrator for account recovery.' });
    }

    await regenerateSession(req);
    req.session.userId = user._id.toString();
    await saveSession(req);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/auth/recovery-login', authLimiter, async (req, res, next) => {
  try {
    const email = cleanText(req.body?.email, 254).toLowerCase();
    const password = req.body?.password;
    const expectedRole = req.body?.expectedRole;
    if (!validEmail(email) || typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 72 || !validRoles.has(expectedRole)) {
      return res.status(400).json({ message: 'Enter a valid email, password, and selected account type.' });
    }
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    if (user.role !== expectedRole) {
      return res.status(403).json({ message: 'This account type does not match the selected role.' });
    }
    const statusError = accountStatusError(user);
    if (statusError) return res.status(statusError.status).json({ message: statusError.message });
    if (user.status !== 'ACTIVE' || user.faceEnrollment?.status === 'ENROLLED') {
      return res.status(403).json({ message: 'This account is not eligible for face-enrollment recovery.' });
    }

    await regenerateSession(req);
    req.session.userId = user._id.toString();
    req.session.recoveryOnly = true;
    await saveSession(req);
    res.json({ recoveryRequired: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/auth/re-enroll', requireAuth, async (req, res, next) => {
  try {
    if (req.session.recoveryOnly !== true || req.body?.consentGranted !== true) {
      return res.status(403).json({ message: 'Complete the authorized account recovery flow to enroll a face.' });
    }
    const user = await User.findById(req.session.userId);
    const statusError = user ? accountStatusError(user) : null;
    if (statusError) return res.status(statusError.status).json({ message: statusError.message });
    if (!user || user.status !== 'ACTIVE' || user.faceEnrollment?.status === 'ENROLLED') {
      return res.status(403).json({ message: 'This account is not eligible for face-enrollment recovery.' });
    }
    const providerEnrollmentId = await enrollFace(req.body?.imageDataUrl, user._id.toString());
    user.faceEnrollment.status = 'ENROLLED';
    user.faceEnrollment.providerEnrollmentId = providerEnrollmentId;
    user.faceEnrollment.consentGivenAt = new Date();
    user.faceEnrollment.consentVersion = CONSENT_VERSION;
    await user.save();
    req.session.recoveryOnly = false;
    await saveSession(req);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/auth/face-login', faceLimiter, async (req, res, next) => {
  try {
    const expectedRole = req.body?.expectedRole;
    if (!validRoles.has(expectedRole)) {
      return res.status(400).json({ message: 'A valid selected account type is required.' });
    }
    const { imageDataUrl } = req.body || {};
    const providerEnrollmentId = await verifyFace(imageDataUrl);
    if (!providerEnrollmentId) {
      return res.status(401).json({ message: 'Face verification failed. Please try again or sign in using your email and password.' });
    }
    const user = await User.findOne({
      'faceEnrollment.providerEnrollmentId': providerEnrollmentId,
    }).select('+faceEnrollment.providerEnrollmentId');
    if (!user) {
      return res.status(401).json({
        message: 'No registered account matches this face. Please complete the authorized registration process before signing in.',
      });
    }
    const statusError = accountStatusError(user);
    if (statusError) return res.status(statusError.status).json({ message: statusError.message });
    if (user.role !== expectedRole) {
      return res.status(403).json({ message: 'This account type does not match the selected role.' });
    }
    await regenerateSession(req);
    req.session.userId = user._id.toString();
    await saveSession(req);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/auth/registration-face-enrollment', faceLimiter, async (req, res, next) => {
  try {
    const email = cleanText(req.body?.email, 254).toLowerCase();
    const invitationToken = cleanText(req.body?.invitationToken, 200);
    const expectedRole = req.body?.expectedRole;
    if (!validEmail(email) || !validRoles.has(expectedRole) || !invitationToken) {
      return res.status(403).json({ message: 'Registration requires an invitation from an authorized administrator.' });
    }
    if (req.body?.consentGranted !== true) {
      return res.status(400).json({ message: 'Biometric consent is required before face enrollment.' });
    }
    if (await User.exists({ email })) return res.status(409).json({ message: 'This email cannot be registered. Contact your administrator.' });

    const inviteHash = tokenHash(invitationToken);
    const invitation = await Invitation.findOne({
      tokenHash: inviteHash,
      email,
      role: expectedRole,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!invitation) {
      return res.status(403).json({ message: 'The invitation is invalid, expired, or does not match this account type.' });
    }

    const previousAttempts = await EnrollmentAttempt.find({ email, invitationId: invitation._id, usedAt: null })
      .select('+providerEnrollmentId')
      .limit(10);
    for (const previousAttempt of previousAttempts) {
      await deleteFaceEnrollment(previousAttempt.providerEnrollmentId);
      await EnrollmentAttempt.deleteOne({ _id: previousAttempt._id, usedAt: null });
    }

    const enrollmentId = new mongoose.Types.ObjectId();
    const providerEnrollmentId = await enrollFace(req.body?.imageDataUrl, enrollmentId.toString());
    const flowToken = crypto.randomBytes(32).toString('base64url');
    try {
      await EnrollmentAttempt.create({
        _id: enrollmentId,
        email,
        role: expectedRole,
        organizationId: invitation.organizationId,
        invitationId: invitation._id,
        invitationTokenHash: inviteHash,
        flowTokenHash: tokenHash(flowToken),
        providerEnrollmentId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });
    } catch (error) {
      await deleteFaceEnrollment(providerEnrollmentId);
      throw error;
    }
    res.status(201).json({ flowToken, expiresInMinutes: 15 });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/auth/register', authLimiter, profilePhotoUpload.single('profilePhoto'), async (req, res, next) => {
  try {
    const fullName = cleanText(req.body?.fullName);
    const email = cleanText(req.body?.email, 254).toLowerCase();
    const password = req.body?.password;
    const confirmPassword = req.body?.confirmPassword;
    const invitationToken = cleanText(req.body?.invitationToken, 200);
    const expectedRole = req.body?.expectedRole;
    const consentGranted = req.body?.consentGranted === 'true';
    const enrollmentFlowToken = cleanText(req.body?.enrollmentFlowToken, 200);
    const department = cleanText(req.body?.department, 120);
    const designation = cleanText(req.body?.designation, 120);
    const contentType = profilePhotoContentType(req.file);

    if (!req.file || !contentType) {
      return res.status(400).json({ message: 'Upload a valid JPG, JPEG, or PNG profile photo no larger than 2 MB.' });
    }
    if (!fullName || !validEmail(email) || !validPassword(password) || password !== confirmPassword) {
      return res.status(400).json({ message: 'Enter your name, valid email, matching passwords, and a password of at least 12 characters.' });
    }
    if (!validRoles.has(expectedRole) || !invitationToken || !enrollmentFlowToken) {
      return res.status(400).json({ message: 'An authorized invitation and completed face enrollment are required.' });
    }
    if (!consentGranted) return res.status(400).json({ message: 'Biometric consent is required before registration.' });

    const flowHash = tokenHash(enrollmentFlowToken);
    const attempt = await EnrollmentAttempt.findOne({
      flowTokenHash: flowHash,
      email,
      role: expectedRole,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    }).select('+flowTokenHash +invitationTokenHash +providerEnrollmentId');
    if (!attempt || !tokensMatch(attempt.invitationTokenHash, tokenHash(invitationToken))) {
      return res.status(403).json({ message: 'Face enrollment has expired or does not match this registration. Please enroll again.' });
    }
    if (await User.exists({ email })) return res.status(409).json({ message: 'This email cannot be registered. Contact your administrator.' });

    const approvedMessage = 'Your registration has been submitted successfully. Your account is awaiting HR/Admin approval.';
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = new mongoose.Types.ObjectId();
    const photoId = new mongoose.Types.ObjectId();
    const session = await mongoose.startSession();
    let createdUser;
    try {
      await session.withTransaction(async () => {
        const claimedAttempt = await EnrollmentAttempt.findOneAndUpdate(
          { _id: attempt._id, usedAt: null, expiresAt: { $gt: new Date() } },
          { $set: { usedAt: new Date() } },
          { new: true, session }
        ).select('+providerEnrollmentId +invitationTokenHash');
        if (!claimedAttempt) {
          const error = new Error('Face enrollment has expired or was already used. Please enroll again.');
          error.status = 409;
          throw error;
        }

        const claimedInvitation = await Invitation.findOneAndUpdate(
          {
            _id: claimedAttempt.invitationId,
            tokenHash: claimedAttempt.invitationTokenHash,
            email,
            role: expectedRole,
            organizationId: claimedAttempt.organizationId,
            usedAt: null,
            expiresAt: { $gt: new Date() },
          },
          { $set: { usedAt: new Date() } },
          { new: true, session }
        );
        if (!claimedInvitation) {
          const error = new Error('The invitation is invalid, expired, or already used.');
          error.status = 403;
          throw error;
        }

        const [user] = await User.create(
          [{
            _id: userId,
            fullName,
            email,
            passwordHash,
            role: claimedInvitation.role,
            status: 'PENDING',
            approvalStatus: 'PENDING',
            organizationId: claimedInvitation.organizationId,
            department,
            designation,
            profilePhotoId: photoId,
            faceEnrollment: {
              status: 'ENROLLED',
              providerEnrollmentId: claimedAttempt.providerEnrollmentId,
              consentGivenAt: new Date(),
              consentVersion: CONSENT_VERSION,
            },
          }],
          { session }
        );
        await ProfilePhoto.create(
          [{ _id: photoId, userId, contentType, data: req.file.buffer }],
          { session }
        );

        if (user.role === 'EMPLOYEE') {
          const reviewers = await User.find({
            organizationId: user.organizationId,
            role: { $in: ['HR', 'ADMIN'] },
            status: 'ACTIVE',
            approvalStatus: { $in: ['APPROVED', null] },
          }).select('_id').session(session);
          if (!reviewers.length) {
            const error = new Error('No active HR or Admin reviewers are available for this organization.');
            error.status = 503;
            throw error;
          }
          await Notification.insertMany(
            reviewers.map((reviewer) => ({
              recipientId: reviewer._id,
              organizationId: user.organizationId,
              type: 'EMPLOYEE_REGISTRATION_REQUEST',
              title: 'New Employee Registration Request',
              message: `${user.fullName} (${user.email}) submitted a registration request. Status: Pending.`,
              relatedUserId: user._id,
              link: '/employee-approvals',
            })),
            { session }
          );
        }

        await AuditEvent.create(
          [{
            actorId: user._id,
            actorRole: user.role,
            action: 'employee.registration_submitted',
            targetUserId: user._id,
            organizationId: user.organizationId,
            details: { status: 'PENDING', faceEnrolled: true, profilePhotoUploaded: true },
          }],
          { session }
        );
        await EnrollmentAttempt.deleteOne({ _id: claimedAttempt._id }, { session });
        createdUser = user;
      });
    } finally {
      await session.endSession();
    }

    res.status(201).json({ message: approvedMessage, user: publicUser(createdUser) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'This email cannot be registered. Contact your administrator.' });
    }
    next(error);
  }
});
app.post('/api/v1/auth/bootstrap-admin', authLimiter, async (req, res, next) => {
  let bootstrapLock = false;
  try {
    const setupToken = req.get('x-initial-admin-token');
    if (!process.env.INITIAL_ADMIN_SETUP_TOKEN || setupToken !== process.env.INITIAL_ADMIN_SETUP_TOKEN) {
      return res.status(403).json({ message: 'Initial administrator provisioning is not authorized.' });
    }
    if (await User.exists({})) {
      return res.status(409).json({ message: 'An account already exists. Use the authorized administrator workflow.' });
    }

    const lock = await SystemState.updateOne(
      { _id: 'initial-admin-bootstrap' },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    if (lock.upsertedCount !== 1) {
      return res.status(409).json({ message: 'Initial administrator provisioning has already been used.' });
    }
    bootstrapLock = true;

    const fullName = cleanText(req.body?.fullName);
    const email = cleanText(req.body?.email, 254).toLowerCase();
    const password = req.body?.password;
    if (!fullName || !validEmail(email) || !validPassword(password)) {
      await SystemState.deleteOne({ _id: 'initial-admin-bootstrap' });
      return res.status(400).json({ message: 'Enter a name, valid email, and password of at least 12 characters.' });
    }
    if (req.body?.consentGranted !== true) {
      await SystemState.deleteOne({ _id: 'initial-admin-bootstrap' });
      return res.status(400).json({ message: 'Biometric consent is required before face enrollment.' });
    }

    const userId = new mongoose.Types.ObjectId();
    const providerEnrollmentId = await enrollFace(req.body?.imageDataUrl, userId.toString());
    const user = await User.create({
      _id: userId,
      fullName,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      faceEnrollment: {
        status: 'ENROLLED',
        providerEnrollmentId,
        consentGivenAt: new Date(),
        consentVersion: CONSENT_VERSION,
      },
    });

    await SystemState.updateOne(
      { _id: 'initial-admin-bootstrap' },
      { $set: { createdAt: new Date(), completed: true } }
    );
    await regenerateSession(req);
    req.session.userId = user._id.toString();
    await saveSession(req);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (bootstrapLock) await SystemState.deleteOne({ _id: 'initial-admin-bootstrap', completed: { $ne: true } });
    next(error);
  }
});

app.post('/api/v1/auth/logout', requireAuth, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('hcm.sid', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    res.status(204).end();
  });
});

app.post('/api/v1/auth/face-enrollment', requireAuth, loadUser, async (req, res, next) => {
  try {
    if (req.body?.consentGranted !== true) {
      return res.status(400).json({ message: 'Biometric consent is required before face enrollment.' });
    }
    const nextEnrollmentId = await enrollFace(req.body?.imageDataUrl, req.user._id.toString());
    const previousEnrollmentId = req.user.faceEnrollment.providerEnrollmentId;
    req.user.faceEnrollment.status = 'ENROLLED';
    req.user.faceEnrollment.providerEnrollmentId = nextEnrollmentId;
    req.user.faceEnrollment.consentGivenAt = new Date();
    req.user.faceEnrollment.consentVersion = CONSENT_VERSION;
    await req.user.save();
    if (previousEnrollmentId !== nextEnrollmentId) await deleteFaceEnrollment(previousEnrollmentId);
    res.json({ success: true, faceEnrolled: true });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/v1/auth/face-enrollment', requireAuth, loadUser, async (req, res, next) => {
  try {
    if (req.body?.consentWithdrawn !== true) {
      return res.status(400).json({ message: 'Confirm that you are withdrawing biometric consent.' });
    }
    await deleteFaceEnrollment(req.user.faceEnrollment.providerEnrollmentId);
    req.user.faceEnrollment.status = 'INCOMPLETE';
    req.user.faceEnrollment.providerEnrollmentId = undefined;
    req.user.faceEnrollment.consentGivenAt = undefined;
    await req.user.save();
    req.session.destroy(() => {});
    res.clearCookie('hcm.sid', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/notifications', requireAuth, loadUser, async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      recipientId: req.user._id,
      dismissedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const pendingRequestCount = ['HR', 'ADMIN'].includes(req.user.role)
      ? await User.countDocuments({
          ...pendingEmployeeQuery(req.user.organizationId),
        })
      : 0;
    res.json({
      notifications: notifications.map((item) => ({
        id: item._id.toString(),
        title: item.title,
        message: item.message,
        link: item.type === 'EMPLOYEE_REGISTRATION_REQUEST'
          ? `/employee-approvals?request=${item.relatedUserId}`
          : item.link,
        createdAt: item.createdAt,
        read: item.isRead,
        type: item.type,
        relatedRequestId: item.relatedUserId.toString(),
      })),
      pendingRequestCount,
    });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/v1/notifications/:id/read', requireAuth, loadUser, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid notification.' });
    const result = await Notification.updateOne(
      { _id: req.params.id, recipientId: req.user._id, dismissedAt: null },
      { $set: { isRead: true } }
    );
    if (!result.matchedCount) return res.status(404).json({ message: 'Notification not found.' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.delete('/api/v1/notifications/:id', requireAuth, loadUser, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid notification.' });
    const result = await Notification.updateOne(
      { _id: req.params.id, recipientId: req.user._id, dismissedAt: null },
      { $set: { dismissedAt: new Date() } }
    );
    if (!result.matchedCount) return res.status(404).json({ message: 'Notification not found.' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/notifications/read-all', requireAuth, loadUser, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, dismissedAt: null, isRead: false },
      { $set: { isRead: true } }
    );
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/admin/employee-requests', requireAuth, loadUser, requireRole('ADMIN', 'HR'), async (req, res, next) => {
  try {
    const requestedStatus = cleanText(req.query.status, 20).toUpperCase() || 'PENDING';
    const allowedStatuses = new Set(['PENDING', 'APPROVED', 'REJECTED']);
    if (!allowedStatuses.has(requestedStatus)) {
      return res.status(400).json({ message: 'Filter status must be pending, approved, or rejected.' });
    }
    const query = requestedStatus === 'PENDING'
      ? pendingEmployeeQuery(req.user.organizationId)
      : {
          organizationId: req.user.organizationId,
          role: 'EMPLOYEE',
          approvalStatus: requestedStatus,
        };
    const employees = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .select('fullName email department designation createdAt status approvalStatus faceEnrollment.status');
    res.json({
      requests: employees.map((employee) => ({
        id: employee._id.toString(),
        fullName: employee.fullName,
        email: employee.email,
        department: employee.department,
        designation: employee.designation,
        registrationDate: employee.createdAt,
        faceEnrollmentStatus: employee.faceEnrollment?.status || 'INCOMPLETE',
        status: employee.approvalStatus || 'PENDING',
        profilePhotoUrl: `/api/v1/users/${employee._id}/profile-photo`,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/admin/employee-requests/:id', requireAuth, loadUser, requireRole('ADMIN', 'HR'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid request.' });
    const employee = await User.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      role: 'EMPLOYEE',
    }).select('fullName email department designation createdAt status approvalStatus approvedAt approvedBy approvedByRole rejectedAt rejectedByRole rejectionReason faceEnrollment.status profilePhotoId');
    if (!employee) return res.status(404).json({ message: 'Employee request not found.' });
    res.json({
      request: {
        id: employee._id.toString(),
        fullName: employee.fullName,
        email: employee.email,
        department: employee.department,
        designation: employee.designation,
        registrationDate: employee.createdAt,
        status: employee.approvalStatus || 'PENDING',
        accountStatus: employee.status,
        faceEnrollmentStatus: employee.faceEnrollment?.status || 'INCOMPLETE',
        approvedAt: employee.approvedAt,
        approvedByRole: employee.approvedByRole,
        rejectedAt: employee.rejectedAt,
        rejectedByRole: employee.rejectedByRole,
        rejectionReason: employee.rejectionReason,
        profilePhotoUrl: employee.profilePhotoId ? `/api/v1/users/${employee._id}/profile-photo` : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

async function decideEmployeeRequest(req, res, next, decision) {
  let transaction;
  let updatedEmployee;
  try {
    transaction = await mongoose.startSession();
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid request.' });
    }
    await transaction.withTransaction(async () => {
      const now = new Date();
      const approved = decision.status === 'APPROVED';
      updatedEmployee = await User.findOneAndUpdate(
        {
          _id: req.params.id,
          organizationId: req.user.organizationId,
          role: 'EMPLOYEE',
          $or: [
            { status: 'PENDING', approvalStatus: 'PENDING' },
            { status: 'ACTIVE', approvalStatus: { $in: ['PENDING', null] } },
          ],
        },
        {
          $set: approved
            ? {
                status: 'ACTIVE',
                approvalStatus: 'APPROVED',
                approvedBy: req.user._id,
                approvedByRole: req.user.role,
                approvedAt: now,
                rejectionReason: '',
              }
            : {
                status: 'REJECTED',
                approvalStatus: 'REJECTED',
                rejectedBy: req.user._id,
                rejectedByRole: req.user.role,
                rejectedAt: now,
                rejectionReason: decision.reason,
              },
        },
        { new: true, runValidators: true, session: transaction }
      );
      if (!updatedEmployee) {
        const error = new Error('This request is no longer pending or could not be found.');
        error.status = 409;
        throw error;
      }

      await Notification.updateMany(
        {
          relatedUserId: updatedEmployee._id,
          type: 'EMPLOYEE_REGISTRATION_REQUEST',
          organizationId: updatedEmployee.organizationId,
          dismissedAt: null,
        },
        { $set: { isRead: true, dismissedAt: now } },
        { session: transaction }
      );
      await Notification.create(
        [{
          recipientId: updatedEmployee._id,
          organizationId: updatedEmployee.organizationId,
          type: 'EMPLOYEE_REGISTRATION_DECISION',
          title: approved ? 'Employee Account Approved' : 'Employee Registration Not Approved',
          message: approved
            ? 'Your registration has been approved. You can now sign in to HCM Lite.'
            : `Your registration request was not approved. Please contact HR or Admin for assistance.${decision.reason ? ` Reason: ${decision.reason}` : ''}`,
          relatedUserId: updatedEmployee._id,
          link: '/dashboard',
        }],
        { session: transaction }
      );
      await AuditEvent.create(
        [{
          actorId: req.user._id,
          actorRole: req.user.role,
          action: approved ? 'employee.registration_approved' : 'employee.registration_rejected',
          targetUserId: updatedEmployee._id,
          organizationId: updatedEmployee.organizationId,
          occurredAt: now,
          details: { previousStatus: 'PENDING', nextStatus: decision.status },
        }],
        { session: transaction }
      );
    });
    return res.json({
      request: {
        id: updatedEmployee._id.toString(),
        status: updatedEmployee.approvalStatus,
        accountStatus: updatedEmployee.status,
        reviewedAt: approvedDate(updatedEmployee, decision.status),
      },
    });
  } catch (error) {
    next(error);
  } finally {
    await transaction?.endSession();
  }
}

function approvedDate(employee, status) {
  return status === 'APPROVED' ? employee.approvedAt : employee.rejectedAt;
}

app.post('/api/v1/admin/employee-requests/:id/approve', requireAuth, loadUser, requireRole('ADMIN', 'HR'), (req, res, next) =>
  decideEmployeeRequest(req, res, next, { status: 'APPROVED' })
);

app.post('/api/v1/admin/employee-requests/:id/reject', requireAuth, loadUser, requireRole('ADMIN', 'HR'), (req, res, next) => {
  const reason = cleanText(req.body?.reason, 500);
  return decideEmployeeRequest(req, res, next, { status: 'REJECTED', reason });
});

app.get('/api/v1/users/:id/profile-photo', requireAuth, loadUser, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).end();
    const target = await User.findById(req.params.id).select('organizationId profilePhotoId');
    if (!target?.profilePhotoId) return res.status(404).end();
    const canView =
      target._id.equals(req.user._id) ||
      (['HR', 'ADMIN'].includes(req.user.role) && target.organizationId === req.user.organizationId);
    if (!canView) return res.status(403).json({ message: 'You are not authorized to view this photo.' });
    const photo = await ProfilePhoto.findOne({ _id: target.profilePhotoId, userId: target._id }).select('+data');
    if (!photo) return res.status(404).end();
    res.set({ 'Content-Type': photo.contentType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    res.send(photo.data);
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/admin/invitations', requireAuth, loadUser, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const email = cleanText(req.body?.email, 254).toLowerCase();
    const role = req.body?.role;
    if (!validEmail(email) || !validRoles.has(role)) {
      return res.status(400).json({ message: 'Enter a valid email and account type.' });
    }
    if (await User.exists({ email })) return res.status(409).json({ message: 'This email already has an account.' });

    const token = crypto.randomBytes(32).toString('base64url');
    await Invitation.create({
      email,
      role,
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      invitedBy: req.user._id,
      organizationId: req.user.organizationId,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });
    res.status(201).json({ invitationToken: token, expiresInHours: 48 });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/v1/admin/users/:id/status', requireAuth, loadUser, requireRole('ADMIN'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid account.' });
    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(req.body?.status)) {
      return res.status(400).json({ message: 'Account status must be ACTIVE, INACTIVE, or SUSPENDED.' });
    }
    const target = await User.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!target) return res.status(404).json({ message: 'Account not found.' });
    if (target.role === 'EMPLOYEE' && target.approvalStatus !== 'APPROVED') {
      return res.status(409).json({ message: 'Employee account changes require an approved request. Use the employee request workflow.' });
    }
    if (req.body.status === 'ACTIVE' && target.approvalStatus === 'REJECTED') {
      return res.status(409).json({ message: 'Rejected accounts cannot be reactivated. Create a new authorized registration.' });
    }
    const update = { status: req.body.status };
    if (req.body.status === 'ACTIVE' && target.role !== 'EMPLOYEE') {
      Object.assign(update, {
        approvalStatus: 'APPROVED',
        approvedBy: req.user._id,
        approvedByRole: req.user.role,
        approvedAt: new Date(),
      });
    }
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/attendance/face', requireAuth, loadUser, faceLimiter, async (req, res, next) => {
  try {
    const action = req.body?.action;
    if (!['check-in', 'check-out'].includes(action)) {
      return res.status(400).json({ message: 'Attendance action must be check-in or check-out.' });
    }
    const enrollmentId = req.user.faceEnrollment.providerEnrollmentId;
    if (!(await verifyFace(req.body?.imageDataUrl, enrollmentId))) {
      return res.status(401).json({ message: 'Face verification failed. Attendance was not recorded.' });
    }

    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10);
    if (action === 'check-in') {
      try {
        const attendance = await Attendance.create({
          userId: req.user._id,
          dayKey,
          checkInAt: now,
          source: 'face',
        });
        return res.status(201).json({ attendance });
      } catch (error) {
        if (error?.code === 11000) {
          return res.status(409).json({ message: 'Attendance has already been recorded for today.' });
        }
        throw error;
      }
    }

    const attendance = await Attendance.findOneAndUpdate(
      { userId: req.user._id, dayKey, checkOutAt: null },
      { $set: { checkOutAt: now } },
      { new: true }
    );
    if (!attendance) {
      return res.status(409).json({ message: 'No open check-in was found for today, or you have already checked out.' });
    }
    res.json({ attendance });
  } catch (error) {
    next(error);
  }
});

const frontendDistPath = fileURLToPath(new URL('../dist', import.meta.url));
registerFrontendFallback(app, frontendDistPath);

app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'The face image is too large. Please try again.' });
  }
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      message: error.code === 'LIMIT_FILE_SIZE'
        ? 'Profile photo must be no larger than 2 MB.'
        : 'Upload one valid JPG, JPEG, or PNG profile photo.',
    });
  }
  const status = Number.isInteger(error?.status) ? error.status : 500;
  if (status >= 500) console.error('API request failed:', error?.name || 'UnknownError');
  res.status(status).json({
    message: status >= 500 ? 'The authentication service is unavailable. Please try again later.' : error.message,
  });
});

async function cleanupExpiredEnrollmentAttempts() {
  const expiredAttempts = await EnrollmentAttempt.find({ expiresAt: { $lte: new Date() } })
    .select('+providerEnrollmentId')
    .limit(100);
  for (const attempt of expiredAttempts) {
    try {
      await deleteFaceEnrollment(attempt.providerEnrollmentId);
      await EnrollmentAttempt.deleteOne({ _id: attempt._id, expiresAt: { $lte: new Date() } });
    } catch (error) {
      console.error('Expired face enrollment cleanup failed:', error?.name || 'UnknownError');
    }
  }
}

await mongoose.connect(process.env.MONGODB_URI);
cleanupExpiredEnrollmentAttempts().catch((error) => {
  console.error('Expired face enrollment cleanup could not start:', error?.name || 'UnknownError');
});
const enrollmentCleanupTimer = setInterval(() => {
  cleanupExpiredEnrollmentAttempts().catch((error) => {
    console.error('Expired face enrollment cleanup could not start:', error?.name || 'UnknownError');
  });
}, 15 * 60 * 1000);
enrollmentCleanupTimer.unref();
app.listen(port, () => {
  console.info(`HCM Lite API listening on port ${port}`);
});
