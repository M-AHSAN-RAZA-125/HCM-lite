import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default empty system state (starts 100% empty as required by hackathon rules)
const initialEmptyState = {
  company: {
    name: '',
    email: '',
    phone: '',
    industry: '',
    website: '',
    address: '',
    city: '',
    country: '',
    isConfigured: false,
    rules: {
      startTime: '09:00',
      endTime: '18:00',
      gracePeriod: 15, // minutes (late after 09:15)
      halfDayHours: 5, // under 5 hours is half day
      weeklyOffDays: ['Saturday', 'Sunday'],
      locationName: 'Headquarters',
      officeLat: 24.8607,
      officeLng: 67.0011,
      radiusMeters: 150,
    },
  },
  users: [], // { id, name, email, passwordHash, role, status, mustChangePassword, employeeId, createdAt }
  departments: [], // { id, name, code, headName }
  designations: [], // { id, title, department }
  leaveTypes: [
    { id: 'annual', name: 'Annual', quota: 14, isPaid: true },
    { id: 'sick', name: 'Sick', quota: 8, isPaid: true },
    { id: 'casual', name: 'Casual', quota: 10, isPaid: true },
    { id: 'unpaid', name: 'Unpaid', quota: 9999, isPaid: false },
  ],
  holidays: [], // { id, name, date }
  employees: [], // { id, employeeId, fullName, email, phone, address, department, designation, joiningDate, salary, status }
  attendance: [], // { id, employeeId, employeeName, date, checkInTime, checkOutTime, status, workHours, correctionRequest }
  leaves: [], // { id, employeeId, employeeName, leaveType, startDate, endDate, workingDays, reason, status, appliedAt, decisionComment, decisionBy, decisionAt }
  payroll: [], // { id, month, status: 'DRAFT'|'FINALIZED', createdBy, finalizedBy, finalizedAt, records: [...] }
  announcements: [], // { id, title, content, author, authorRole, target, createdAt }
  notifications: [], // { id, userId, title, message, type, isRead, createdAt }
  auditLogs: [], // { id, actor: { id, name, role }, action, entity, details, createdAt }
};

let memoryDb = null;
let saveTimeout = null;

// Load or initialize DB
export function getDb() {
  if (memoryDb) return memoryDb;

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      memoryDb = JSON.parse(raw);
      // Ensure all root collections exist
      for (const key of Object.keys(initialEmptyState)) {
        if (!memoryDb[key]) {
          memoryDb[key] = Array.isArray(initialEmptyState[key]) ? [] : { ...initialEmptyState[key] };
        }
      }
      return memoryDb;
    } catch (err) {
      console.error('Failed to parse db.json, creating clean empty database', err);
    }
  }

  // Create new empty state
  memoryDb = JSON.parse(JSON.stringify(initialEmptyState));
  saveDbSync();
  return memoryDb;
}

export function saveDbSync() {
  if (!memoryDb) return;
  fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), 'utf-8');
}

export function saveDb() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDbSync();
  }, 50);
}

// Reset system to clean empty state (for demo / judging restart)
export function resetDb() {
  memoryDb = JSON.parse(JSON.stringify(initialEmptyState));
  saveDbSync();
  return memoryDb;
}
