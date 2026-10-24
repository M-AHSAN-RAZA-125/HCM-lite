import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { Attendance, Invitation, SystemState, User } from './models.js';
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
const consentText =
  'I consent to facial biometric processing by the configured identity verification provider for account authentication and attendance. I understand that face images are sent for verification, enrollment metadata is retained, and I may withdraw consent by contacting an administrator.';

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI must be configured before starting the API server.');
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 characters.');
}
if (!process.env.APP_ORIGIN) throw new Error('APP_ORIGIN must be configured to protect authenticated requests.');

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json({ limit: '7mb', type: 'application/json' }));
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
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

app.use((req, res, next) => {
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.get('origin');
  const allowedOrigin = process.env.APP_ORIGIN;
  if (!origin || origin !== allowedOrigin) {
    return res.status(403).json({ message: 'Request origin is not allowed.' });
  }
  next();
});

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

function cleanText(value, maxLength = 120) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function validPassword(password) {
  return typeof password === 'string' && password.length >= 12 && Buffer.byteLength(password, 'utf8') <= 72;
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    faceEnrolled: user.faceEnrollment?.status === 'ENROLLED',
  };
}

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ message: 'Please sign in to continue.' });
  next();
}

async function loadUser(req, res, next) {
  try {
    const user = await User.findById(req.session.userId).select('+faceEnrollment.providerEnrollmentId');
    if (!user || user.status !== 'ACTIVE' || user.faceEnrollment?.status !== 'ENROLLED') {
      req.session.destroy(() => {});
      return res.status(401).json({ message: 'This account is not eligible to sign in.' });
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

app.get('/api/v1/auth/me', requireAuth, loadUser, (req, res) => {
  res.json({ user: publicUser(req.user) });
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
    if (user.status === 'PENDING') {
      return res.status(403).json({ message: 'Your account is pending approval. Contact your authorized administrator.' });
    }
    if (user.status !== 'ACTIVE') return res.status(403).json({ message: 'This account is inactive.' });
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
      return res.status(401).json({ message: 'Face verification failed. Please try again or sign in with email and password.' });
    }
    const user = await User.findOne({
      'faceEnrollment.providerEnrollmentId': providerEnrollmentId,
    }).select('+faceEnrollment.providerEnrollmentId');
    if (!user || user.status !== 'ACTIVE' || user.faceEnrollment?.status !== 'ENROLLED') {
      return res.status(401).json({
        message: 'No eligible registered account matches this face. Please contact your administrator.',
      });
    }
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

app.post('/api/v1/auth/register', authLimiter, async (req, res, next) => {
  let claimedInvitation;
  try {
    const fullName = cleanText(req.body?.fullName);
    const email = cleanText(req.body?.email, 254).toLowerCase();
    const password = req.body?.password;
    const invitationToken = cleanText(req.body?.invitationToken, 200);
    const expectedRole = req.body?.expectedRole;
    const consentGranted = req.body?.consentGranted === true;
    const imageDataUrl = req.body?.imageDataUrl;

    if (!fullName || !validEmail(email) || !validPassword(password)) {
      return res.status(400).json({ message: 'Enter your name, a valid email, and a password of at least 12 characters and no more than 72 UTF-8 bytes.' });
    }
    if (!validRoles.has(expectedRole) || !invitationToken) {
      return res.status(403).json({ message: 'Registration requires an invitation from an authorized administrator.' });
    }
    if (!consentGranted) return res.status(400).json({ message: 'Biometric consent is required before face enrollment.' });
    if (await User.exists({ email })) return res.status(409).json({ message: 'This email cannot be registered. Contact your administrator.' });

    const tokenHash = crypto.createHash('sha256').update(invitationToken).digest('hex');
    claimedInvitation = await Invitation.findOneAndUpdate(
      {
        tokenHash,
        email,
        role: expectedRole,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { $set: { usedAt: new Date() } },
      { new: true }
    );
    if (!claimedInvitation) {
      return res.status(403).json({ message: 'The invitation is invalid, expired, or does not match this account type.' });
    }

    const userId = new mongoose.Types.ObjectId();
    const providerEnrollmentId = await enrollFace(imageDataUrl, userId.toString());
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      _id: userId,
      fullName,
      email,
      passwordHash,
      role: claimedInvitation.role,
      status: 'PENDING',
      faceEnrollment: {
        status: 'ENROLLED',
        providerEnrollmentId,
        consentGivenAt: new Date(),
        consentVersion: CONSENT_VERSION,
      },
    });
    res.status(201).json({
      message: 'Registration and face enrollment are complete. Your account is pending administrator approval.',
      user: publicUser(user),
    });
  } catch (error) {
    if (claimedInvitation) {
      await Invitation.updateOne({ _id: claimedInvitation._id }, { $set: { usedAt: null } });
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
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });
    res.status(201).json({ invitationToken: token, expiresInHours: 48 });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/v1/admin/users/:id/status', requireAuth, loadUser, requireRole('ADMIN'), async (req, res, next) => {
  try {
    if (!['ACTIVE', 'INACTIVE'].includes(req.body?.status)) {
      return res.status(400).json({ message: 'Account status must be ACTIVE or INACTIVE.' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { status: req.body.status } },
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

app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'The face image is too large. Please try again.' });
  }
  const status = Number.isInteger(error?.status) ? error.status : 500;
  if (status >= 500) console.error('API request failed:', error?.name || 'UnknownError');
  res.status(status).json({
    message: status >= 500 ? 'The authentication service is unavailable. Please try again later.' : error.message,
  });
});

await mongoose.connect(process.env.MONGODB_URI);
app.listen(port, () => {
  console.info(`HCM Lite API listening on port ${port}`);
});
