import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { xcode } from './xcode-client.js';

const app = express();
app.use(cors({ origin: config.clientOrigins, credentials: false }));
app.use(express.json());

type MemberSession = { phoneNumber?: string; email?: string; role: 'member' | 'merchant' | 'admin' };
const validPhone = (value: unknown) => typeof value === 'string' && /^\+?\d{8,15}$/.test(value.trim());
const validEmail = (value: unknown) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

function issueMemberSession(data: Omit<MemberSession, 'role'>) {
  return jwt.sign({ ...data, role: 'member' }, config.appJwtSecret, { expiresIn: '8h' });
}

function requireSession(req: Request, res: Response, next: NextFunction) {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Missing application session token.' });
  try {
    res.locals.session = jwt.verify(token, config.appJwtSecret) as MemberSession;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired application session.' });
  }
}

function hasMemberRecord(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return Boolean(record.PhoneNumber || record.phoneNumber || record.Email || record.email || record.Id || record.id);
}

function withoutPassword(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutPassword);
  if (!value || typeof value !== 'object') return value;
  const { Password: _password, password: _passwordLower, ...safeValue } = value as Record<string, unknown>;
  return safeValue;
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/auth/request-otp', async (req, res, next) => {
  try {
    const { phoneNumber, deviceId = '00000000-0000-4000-8000-000000000001' } = req.body;
    if (!validPhone(phoneNumber)) return res.status(400).json({ message: 'Enter a valid phone number.' });
    if (config.useMockXcode) return res.json({ success: true, developmentOtp: '654321' });
    const data = await xcode.post('MemberAccount/RequestOTP', { PhoneNumber: phoneNumber, DeviceId: deviceId });
    res.json(data);
  } catch (error) { next(error); }
});

app.post('/auth/register-otp', async (req, res, next) => {
  try {
    const { phoneNumber, deviceId = '00000000-0000-4000-8000-000000000001' } = req.body;
    if (!validPhone(phoneNumber)) return res.status(400).json({ message: 'Enter a valid phone number.' });
    if (config.useMockXcode) return res.json({ success: true, developmentOtp: '123456' });
    res.json(await xcode.post('MemberAccount/RegisterOtp', { PhoneNumber: phoneNumber, DeviceId: deviceId }));
  } catch (error) { next(error); }
});

app.post('/auth/login/phone', async (req, res, next) => {
  try {
    const { phoneNumber, otp, firstLogin = 'True', accountStatus = '', deviceId = '00000000-0000-4000-8000-000000000001' } = req.body;
    if (!validPhone(phoneNumber) || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) return res.status(400).json({ message: 'Enter a valid phone number and six-digit verification code.' });
    if (config.useMockXcode) {
      if (otp !== '654321') return res.status(400).json({ message: 'Use development OTP 654321.' });
      return res.json({ member: { PhoneNumber: phoneNumber, Name: 'Demo Member' }, sessionToken: issueMemberSession({ phoneNumber }) });
    }
    const isFirstLogin = firstLogin === true || String(firstLogin).toLowerCase() === 'true';
    if (isFirstLogin) {
      await xcode.post('MemberLogin/UpdateDeviceId', { PhoneNumber: phoneNumber, DeviceId: deviceId });
    }
    const member = await xcode.post('MemberLogin/MemberMobileLoginGetProfile', { Phone: phoneNumber, OTP: otp, FirstLogin: isFirstLogin, DeviceId: deviceId, AccountStatus: accountStatus });
    res.json({ member: withoutPassword(member), sessionToken: issueMemberSession({ phoneNumber }) });
  } catch (error) { next(error); }
});

app.post('/auth/login/email', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!validEmail(email) || typeof password !== 'string' || !password) return res.status(400).json({ message: 'Enter a valid email and password.' });
    if (config.useMockXcode) return res.json({ member: { Email: email, Name: 'Demo Member' }, sessionToken: issueMemberSession({ email }) });
    const member = await xcode.post('MemberLogin/CheckEmailPassword', { Email: email, Password: password });
    res.json({ member: withoutPassword(member), sessionToken: issueMemberSession({ email }) });
  } catch (error) { next(error); }
});

app.post('/auth/register', async (req, res, next) => {
  try {
    const { name, email, phoneNumber, referralBy = '', password, birthday = '' } = req.body;
    if (typeof name !== 'string' || name.trim().length < 2 || !validEmail(email) || !validPhone(phoneNumber) || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Enter a name, valid email, valid phone number, and password of at least 8 characters.' });
    }
    if (config.useMockXcode) return res.status(201).json({ member: { Name: name, Email: email, PhoneNumber: phoneNumber }, sessionToken: issueMemberSession({ phoneNumber, email }) });
    const member = await xcode.post('MemberLogin/RegisterMember', { Name: name, Email: email, PhoneNumber: phoneNumber, ReferralBy: referralBy, Password: password, Birthday: birthday, EmailSubcribe: 'true', Image: '', ImageByte: '' });
    res.status(201).json({ member: withoutPassword(member), sessionToken: issueMemberSession({ phoneNumber, email }) });
  } catch (error) { next(error); }
});

app.post('/member/referral/check', async (req, res, next) => {
  try {
    const { referralCode } = req.body;
    if (!referralCode) return res.status(400).json({ message: 'referralCode is required.' });
    if (config.useMockXcode) return res.json({ valid: true });
    res.json(await xcode.post('MemberWallet/CheckReffererCodeValid', { ReferralCode: referralCode }));
  } catch (error) { next(error); }
});

app.post('/member/availability', async (req, res, next) => {
  try {
    const { phoneNumber, email } = req.body;
    if (!phoneNumber || !email) return res.status(400).json({ message: 'phoneNumber and email are required.' });
    if (config.useMockXcode) return res.json({ phoneAvailable: true, emailAvailable: true });
    const [phoneMember, emailMember] = await Promise.all([
      xcode.post('ManageMember/FindMemberByPhone', { PhoneNumber: phoneNumber }),
      xcode.post('ManageMember/FindMemberByEmail', { Email: email })
    ]);
    res.json({ phoneAvailable: !hasMemberRecord(phoneMember), emailAvailable: !hasMemberRecord(emailMember) });
  } catch (error) { next(error); }
});

app.get('/members/:phoneNumber/dashboard', requireSession, async (req, res, next) => {
  try {
    const { phoneNumber } = req.params;
    const session = res.locals.session as MemberSession;
    if (session.phoneNumber && session.phoneNumber !== phoneNumber) return res.status(403).json({ message: 'You can only access your own member dashboard.' });
    const [member, wallet, stamps, rewards, vouchers, history, outlets, notifications, redeemedRewards] = await Promise.all([
      xcode.post('MemberAccount/GetMemberDetails', { PhoneNumber: phoneNumber }),
      xcode.post('MemberWallet/MemberGetWalletDetails', { PhoneNumber: phoneNumber }),
      xcode.post('MemberAccount/GetMemberStampList', { PhoneNumber: phoneNumber }),
      xcode.get('MemberReward/GetRewards'),
      xcode.post('MemberVoucher/GetVoucherByPhone', { PhoneNumber: phoneNumber }),
      xcode.post('History/GetAllRecordByPhoneNumber', { PhoneNumber: phoneNumber }),
      xcode.get('ManageOutlets/GetAllOutlets'),
      xcode.post('MemberNotification/GetNotificationsFilterMember', { PhoneNumber: phoneNumber }),
      xcode.post('MemberAccount/GetMemberReward', { PhoneNumber: phoneNumber })
    ]);
    res.json({ member: withoutPassword(member), wallet, stamps, rewards, vouchers, history, outlets, notifications, redeemedRewards });
  } catch (error) { next(error); }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const upstream = typeof error === 'object' && error && 'response' in error
    ? (error as { response?: { status?: number; data?: unknown } }).response
    : undefined;
  const status = upstream?.status || 500;
  const body = upstream?.data;
  const upstreamMessage = typeof body === 'string'
    ? body
    : body && typeof body === 'object'
      ? String((body as Record<string, unknown>).message || (body as Record<string, unknown>).Message || (body as Record<string, unknown>).error || '')
      : '';
  // Do not log the Axios request config: it contains the bearer token.
  console.error(`Loyalty gateway error (${status}): ${upstreamMessage || 'No API error message returned.'}`);
  const configurationError = error instanceof Error && error.message.startsWith('XCODE_');
  res.status(status).json({ message: configurationError ? error.message : (upstreamMessage || 'The loyalty service request failed.') });
});

app.listen(config.port, () => console.log(`Loyalty backend listening on http://localhost:${config.port}`));
