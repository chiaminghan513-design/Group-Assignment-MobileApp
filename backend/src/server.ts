import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { xcode } from './xcode-client.js';

const app = express();
app.use(cors({ origin: config.clientOrigins, credentials: false }));
app.use(express.json());

type MemberSession = { phoneNumber?: string; email?: string; merchantId?: string; role: 'member' | 'merchant' | 'admin' };
type ResetOtp = { code: string; expiresAt: number };
const resetOtps = new Map<string, ResetOtp>();
const emailOtps = new Map<string, ResetOtp>();
const validPhone = (value: unknown) => typeof value === 'string' && /^\+?\d{8,15}$/.test(value.trim());
const validEmail = (value: unknown) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

function issueMemberSession(data: Omit<MemberSession, 'role'>) {
  return jwt.sign({ ...data, role: 'member' }, config.appJwtSecret, { expiresIn: '8h' });
}

function issueMerchantSession(merchantId: string) {
  return jwt.sign({ merchantId, role: 'merchant' }, config.appJwtSecret, { expiresIn: '10h' });
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

function requireMerchant(req: Request, res: Response, next: NextFunction) {
  requireSession(req, res, () => {
    const session = res.locals.session as MemberSession;
    if (session.role !== 'merchant' || !session.merchantId) return res.status(403).json({ message: 'Merchant sign-in is required.' });
    next();
  });
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

function firstRecord(value: unknown): Record<string, unknown> {
  const record = Array.isArray(value) ? value[0] : value;
  return record && typeof record === 'object' ? record as Record<string, unknown> : {};
}

function extractOtp(value: unknown): string {
  if (typeof value === 'string') return /^\d{4,10}$/.test(value.replace(/"/g, '').trim()) ? value.replace(/"/g, '').trim() : '';
  return String(firstRecord(value).OTP || '');
}

function memberPhone(req: Request, res: Response): string | undefined {
  const phoneNumber = req.params.phoneNumber;
  const session = res.locals.session as MemberSession;
  if (!session.phoneNumber || session.phoneNumber !== phoneNumber) {
    res.status(403).json({ message: 'You can only access your own member account.' });
    return undefined;
  }
  return phoneNumber;
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/pos/login', async (req, res, next) => {
  try {
    const merchantId = String(req.body.merchantId || '').trim();
    const password = String(req.body.password || '');
    if (!merchantId || !password) return res.status(400).json({ message: 'Enter the merchant ID and password.' });
    const profile = await xcode.post('MerchantLogin/MerchantPosMachineLoginGetProfile', { MerchantId: merchantId, Password: password });
    if (!Object.keys(firstRecord(profile)).length) return res.status(401).json({ message: 'The merchant ID or password is incorrect.' });
    res.json({ profile: withoutPassword(profile), sessionToken: issueMerchantSession(merchantId), merchantId });
  } catch (error) { next(error); }
});

app.post('/pos/member/scan', requireMerchant, async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    if (!validPhone(phone)) return res.status(400).json({ message: 'Enter a valid member phone number.' });
    res.json(await xcode.post('MerchantScanMemberInfo/ScanGetMemberDetails', { Phone: phone }));
  } catch (error) { next(error); }
});

app.post('/pos/member/register', requireMerchant, async (req, res, next) => {
  try {
    const name = String(req.body.Name || '').trim();
    const email = String(req.body.Email || '').trim();
    const phoneNumber = String(req.body.PhoneNumber || '').trim();
    if (!name || !validEmail(email) || !validPhone(phoneNumber)) {
      return res.status(400).json({ message: 'Enter the member name, a valid email, and a valid phone number.' });
    }
    const member = {
      Id: 0,
      UserId: '',
      Name: name,
      Email: email,
      PhoneNumber: phoneNumber,
      BirthDate: String(req.body.BirthDate || ''),
      ReferralCode: '',
      ReferralBy: String(req.body.ReferralBy || ''),
      Password: String(req.body.Password || ''),
      Tier: 'Member',
      Image: '',
      ImageByte: '',
      FirstLogin: 'True',
      EmailSubcribe: 'active',
      NotificationStatus: 'true',
      AccountStatus: 'active',
      RegisterTime: new Date().toISOString(),
      DeviceId: '',
      DeliveryStatus: '',
      EmailVerified: false,
      PhoneVerified: false
    };
    res.json(await xcode.post('MerchantRegisterMember/RegisterMember', member));
  } catch (error) { next(error); }
});

const posActionEndpoints: Record<string, { endpoint: string; merchantField?: string }> = {
  'cash-spend': { endpoint: 'MerchantSpend/CashSpend', merchantField: 'MerchantId' },
  'wallet-spend': { endpoint: 'MerchantSpend/WalletSpend', merchantField: 'MerchantId' },
  topup: { endpoint: 'MerchantTopup/CreateTopUpWallet', merchantField: 'MerchantId' },
  'update-topup': { endpoint: 'MerchantTopup/UpdateTopUpWallet' },
  points: { endpoint: 'ManagePoint/AssignPoint', merchantField: 'MerchantId' },
  'assign-stamp': { endpoint: 'MerchantStamp/AssignStamp', merchantField: 'Merchant_Id' },
  'check-stamp': { endpoint: 'MerchantStamp/CheckMemberStampList' },
  'use-stamp': { endpoint: 'MerchantStamp/UseStamp', merchantField: 'Merchant_Id' },
  'redeem-reward': { endpoint: 'MerchantScanReward/ScanReward', merchantField: 'Merchant_Id' },
  'void-spend': { endpoint: 'MerchantSpend/VoidSpend' },
  'void-topup': { endpoint: 'MerchantTransactionHistories/VoidTopupRecord' }
};

app.post('/pos/actions/:action', requireMerchant, async (req, res, next) => {
  try {
    const action = posActionEndpoints[String(req.params.action)];
    if (!action) return res.status(404).json({ message: 'Unknown POS action.' });
    const session = res.locals.session as MemberSession;
    const payload = { ...req.body } as Record<string, unknown>;
    if (action.merchantField) payload[action.merchantField] = session.merchantId;
    res.json(await xcode.post(action.endpoint, payload));
  } catch (error) { next(error); }
});

const posHistoryEndpoints: Record<string, string> = {
  topups: 'MerchantTransactionHistories/GetAllTopUpRecordsFilterMerchant',
  spends: 'MerchantTransactionHistories/GetAllSpendRecordsFilterMerchant',
  rewards: 'MerchantTransactionHistories/GetAllRewardRecordsFilterMerchant',
  vouchers: 'MerchantTransactionHistories/GetAllVoucherRecordsFilterMerchant',
  stamps: 'MerchantTransactionHistories/GetAllStampRecordsFilterMerchant',
  points: 'ManagePoint/GetAllPointAssignRecordByMerchantId'
};

app.get('/pos/history/:type', requireMerchant, async (req, res, next) => {
  try {
    const endpoint = posHistoryEndpoints[String(req.params.type)];
    if (!endpoint) return res.status(404).json({ message: 'Unknown transaction history.' });
    const session = res.locals.session as MemberSession;
    res.json(await xcode.post(endpoint, { MerchantId: session.merchantId }));
  } catch (error) { next(error); }
});

const posMemberHistoryEndpoints: Record<string, { endpoint: string; phoneField: string }> = {
  spends: { endpoint: 'MerchantTransactionHistories/GetMemberSpendRecords', phoneField: 'PhoneNumber' },
  topups: { endpoint: 'MerchantTransactionHistories/GetTopUpRecordsFilterByMember', phoneField: 'Phone' },
  rewards: { endpoint: 'MerchantTransactionHistories/GetAllRewardsRecordsFilterByMember', phoneField: 'Phone' },
  vouchers: { endpoint: 'MerchantTransactionHistories/GetAllVoucherRecordsFilterByMember', phoneField: 'Phone' }
};

app.post('/pos/member/history/:type', requireMerchant, async (req, res, next) => {
  try {
    const route = posMemberHistoryEndpoints[String(req.params.type)];
    if (!route) return res.status(404).json({ message: 'That member history category is unavailable.' });
    const phone = String(req.body.phone || '').trim();
    if (!validPhone(phone)) return res.status(400).json({ message: 'Enter a valid member phone number.' });
    res.json(await xcode.post(route.endpoint, { [route.phoneField]: phone }));
  } catch (error) { next(error); }
});

app.post('/pos/notifications/:audience', requireMerchant, async (req, res, next) => {
  try {
    const audience = String(req.params.audience);
    if (!['all', 'member'].includes(audience)) return res.status(404).json({ message: 'Unknown notification audience.' });
    const header = String(req.body.NotificationHeader || '').trim();
    const body = String(req.body.NotificationBody || '').trim();
    if (!header || !body) return res.status(400).json({ message: 'Enter a notification title and message.' });
    const payload: Record<string, unknown> = {
      Type: String(req.body.Type || 'Merchant'),
      TargetId: String(req.body.TargetId || ''),
      NotificationHeader: header,
      NotificationBody: body
    };
    if (audience === 'member') {
      const phone = String(req.body.PhoneNumber || '').trim();
      if (!validPhone(phone)) return res.status(400).json({ message: 'Select a member or enter a valid phone number.' });
      payload.PhoneNumber = phone;
      payload.DeviceId = String(req.body.DeviceId || '');
    }
    const endpoint = audience === 'all'
      ? 'MerchantCreateNotification/CreateNotificationAll'
      : 'MerchantCreateNotification/CreateNotificationByDeviceId';
    res.json(await xcode.post(endpoint, payload));
  } catch (error) { next(error); }
});

app.post('/pos/eod', requireMerchant, async (req, res, next) => {
  try {
    const session = res.locals.session as MemberSession;
    const selectDate = req.body.selectDate || new Date().toISOString();
    res.json(await xcode.post('MerchantTransactionHistories/MerchantPrintEOD', { MerchantId: session.merchantId, SelectDate: selectDate }));
  } catch (error) { next(error); }
});

app.post('/auth/request-otp', async (req, res, next) => {
  try {
    const { phoneNumber, deviceId = '00000000-0000-4000-8000-000000000001' } = req.body;
    if (!validPhone(phoneNumber)) return res.status(400).json({ message: 'Enter a valid phone number.' });
    const data = await xcode.post('MemberAccount/RequestOTP', { PhoneNumber: phoneNumber, DeviceId: deviceId });
    res.json(data);
  } catch (error) { next(error); }
});

app.post('/auth/register-otp', async (req, res, next) => {
  try {
    const { phoneNumber, deviceId = '00000000-0000-4000-8000-000000000001' } = req.body;
    if (!validPhone(phoneNumber)) return res.status(400).json({ message: 'Enter a valid phone number.' });
    res.json(await xcode.post('MemberAccount/RegisterOtp', { PhoneNumber: phoneNumber, DeviceId: deviceId }));
  } catch (error) { next(error); }
});

app.post('/auth/login/phone', async (req, res, next) => {
  try {
    const { phoneNumber, otp, firstLogin = 'True', accountStatus = '', deviceId = '00000000-0000-4000-8000-000000000001' } = req.body;
    if (!validPhone(phoneNumber) || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) return res.status(400).json({ message: 'Enter a valid phone number and six-digit verification code.' });
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
    const member = await xcode.post('MemberLogin/CheckEmailPassword', { Email: email, Password: password });
    const phoneNumber = String(firstRecord(member).PhoneNumber || '');
    res.json({ member: withoutPassword(member), sessionToken: issueMemberSession({ email, ...(phoneNumber ? { phoneNumber } : {}) }) });
  } catch (error) { next(error); }
});

app.post('/auth/keep-login', async (req, res, next) => {
  try {
    const { phoneNumber, deviceId } = req.body;
    if (!validPhone(phoneNumber) || typeof deviceId !== 'string' || !deviceId) return res.status(400).json({ message: 'A valid phone number and device ID are required.' });
    const result = await xcode.post('MemberAccount/KeepLoginUser', { PhoneNumber: phoneNumber, DeviceId: deviceId });
    const member = await xcode.post('MemberDetails/GetMemberDetails', { PhoneNumber: phoneNumber });
    res.json({ keepLogin: result, member: withoutPassword(member), sessionToken: issueMemberSession({ phoneNumber }) });
  } catch (error) { next(error); }
});

app.post('/auth/password-reset/request', async (req, res, next) => {
  try {
    const { phoneNumber, deviceId = '00000000-0000-4000-8000-000000000001' } = req.body;
    if (!validPhone(phoneNumber)) return res.status(400).json({ message: 'Enter a valid phone number.' });
    const result = await xcode.post('MemberAccount/RequestOTP', { PhoneNumber: phoneNumber, DeviceId: deviceId });
    const code = String(firstRecord(result).OTP || '');
    if (!/^\d{6}$/.test(code)) return res.status(502).json({ message: 'The loyalty service did not return a valid reset code.' });
    resetOtps.set(phoneNumber, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
    res.json(result);
  } catch (error) { next(error); }
});

app.post('/auth/password-reset/confirm', async (req, res, next) => {
  try {
    const { phoneNumber, otp, newPassword } = req.body;
    if (!validPhone(phoneNumber) || typeof otp !== 'string' || !/^\d{6}$/.test(otp) || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ message: 'Enter a valid phone number, six-digit code, and password of at least 8 characters.' });
    }
    const pending = resetOtps.get(phoneNumber);
    if (!pending || pending.expiresAt < Date.now() || pending.code !== otp) return res.status(400).json({ message: 'The reset code is invalid or expired.' });
    const result = await xcode.post('MemberAccount/MemberResetPassword', { PhoneNumber: phoneNumber, NewPassword: newPassword });
    resetOtps.delete(phoneNumber);
    res.json(result);
  } catch (error) { next(error); }
});

app.post('/auth/register', async (req, res, next) => {
  try {
    const { name, email, phoneNumber, referralBy = '', password, birthday = '' } = req.body;
    if (typeof name !== 'string' || name.trim().length < 2 || !validEmail(email) || !validPhone(phoneNumber) || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Enter a name, valid email, valid phone number, and password of at least 8 characters.' });
    }
    const member = await xcode.post('MemberLogin/RegisterMember', { Name: name, Email: email, PhoneNumber: phoneNumber, ReferralBy: referralBy, Password: password, Birthday: birthday, EmailSubcribe: 'true', Image: '', ImageByte: '' });
    res.status(201).json({ member: withoutPassword(member), sessionToken: issueMemberSession({ phoneNumber, email }) });
  } catch (error) { next(error); }
});

app.post('/member/referral/check', async (req, res, next) => {
  try {
    const { referralCode } = req.body;
    if (!referralCode) return res.status(400).json({ message: 'referralCode is required.' });
    res.json(await xcode.post('MemberWallet/CheckReffererCodeValid', { ReferralCode: referralCode }));
  } catch (error) { next(error); }
});

app.post('/member/availability', async (req, res, next) => {
  try {
    const { phoneNumber, email } = req.body;
    if (!phoneNumber || !email) return res.status(400).json({ message: 'phoneNumber and email are required.' });
    const [phoneMember, emailMember] = await Promise.all([
      xcode.post('ManageMember/FindMemberByPhone', { PhoneNumber: phoneNumber }),
      xcode.post('ManageMember/FindMemberByEmail', { Email: email })
    ]);
    res.json({ phoneAvailable: !hasMemberRecord(phoneMember), emailAvailable: !hasMemberRecord(emailMember) });
  } catch (error) { next(error); }
});

app.get('/members/:phoneNumber/qr', requireSession, (req, res) => {
  const { phoneNumber } = req.params;
  const session = res.locals.session as MemberSession;
  if (!session.phoneNumber || session.phoneNumber !== phoneNumber) {
    return res.status(403).json({ message: 'You can only create a QR code for your own member account.' });
  }
  // The QR contains a signed, short-lived member reference instead of a hard-coded pattern or raw profile data.
  const qrToken = jwt.sign({ purpose: 'member-scan', phoneNumber }, config.appJwtSecret, { expiresIn: '5m' });
  res.json({ qrToken, expiresInSeconds: 300 });
});

app.get('/members/:phoneNumber/rewards/:rewardId/qr', requireSession, (req, res) => {
  const phoneNumber = memberPhone(req, res);
  if (!phoneNumber) return;
  const { rewardId } = req.params;
  const kind = req.query.kind === 'voucher' ? 'voucher' : 'reward';
  const qrToken = jwt.sign({ purpose: 'reward-scan', phoneNumber, rewardId, kind }, config.appJwtSecret, { expiresIn: '5m' });
  res.json({ qrToken, rewardId, kind, expiresInSeconds: 300 });
});

app.get('/members/:phoneNumber/rewards/:rewardId', requireSession, async (req, res, next) => {
  try {
    const phoneNumber = memberPhone(req, res);
    if (!phoneNumber) return;
    const voucher = req.query.kind === 'voucher';
    const data = voucher
      ? await xcode.post('MemberVoucher/GetVoucherById', { RewardId: req.params.rewardId, PhoneNumber: phoneNumber })
      : await xcode.post('MemberReward/FindReward', { RewardId: req.params.rewardId });
    res.json(data);
  } catch (error) { next(error); }
});

app.get('/members/:phoneNumber/history/:type', requireSession, async (req, res, next) => {
  try {
    const phoneNumber = memberPhone(req, res);
    if (!phoneNumber) return;
    const endpoints: Record<string, string> = {
      all: 'History/GetAllRecordByPhoneNumber', topups: 'History/GetTopUpRecordByPhoneNumber',
      payments: 'History/GetPaymentRecordByPhoneNumber', points: 'History/GetAssignPointRecordByPhoneNumber',
      stamps: 'History/GetAssignStampRecordByPhoneNumber', stampuse: 'History/GetStampRecordByPhoneNumber',
      rewards: 'History/GetRedeemRewardRecordByPhoneNumber', vouchers: 'History/GetRedeemVoucherRecordByPhoneNumber',
      spends: 'MemberAccount/GetSpendRecords', voucherhistory: 'MemberAccount/GetMemberVoucherHistories'
    };
    const endpoint = endpoints[String(req.params.type).toLowerCase()];
    if (!endpoint) return res.status(400).json({ message: 'Unsupported history filter.' });
    res.json(await xcode.post(endpoint, { PhoneNumber: phoneNumber }));
  } catch (error) { next(error); }
});

app.get('/members/:phoneNumber/notifications/:notificationId', requireSession, async (req, res, next) => {
  try {
    if (!memberPhone(req, res)) return;
    res.json(await xcode.post('MemberNotification/GetNotificationsDetails', { Notification_Id: req.params.notificationId }));
  } catch (error) { next(error); }
});

app.post('/members/:phoneNumber/notifications/:notificationId/read', requireSession, async (req, res, next) => {
  try {
    const phoneNumber = memberPhone(req, res);
    if (!phoneNumber) return;
    res.json(await xcode.post('MemberNotification/UserReadNotification', { PhoneNumber: phoneNumber, NotificationId: req.params.notificationId }));
  } catch (error) { next(error); }
});

app.post('/members/:phoneNumber/notifications/read-all', requireSession, async (req, res, next) => {
  try {
    const phoneNumber = memberPhone(req, res);
    if (!phoneNumber) return;
    res.json(await xcode.post('MemberNotification/UserReadAllNotification', { PhoneNumber: phoneNumber }));
  } catch (error) { next(error); }
});

app.post('/members/:phoneNumber/email-verification/request', requireSession, async (req, res, next) => {
  try {
    const phoneNumber = memberPhone(req, res);
    if (!phoneNumber) return;
    const result = await xcode.post('MemberAccount/GenerateMailOTP', { PhoneNumber: phoneNumber, DeviceId: '' });
    const code = extractOtp(result);
    if (!/^\d{4,10}$/.test(code)) return res.status(502).json({ message: 'The loyalty service did not return a valid email verification code.' });
    emailOtps.set(phoneNumber, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
    res.json({ requested: true, ...(config.nodeEnv === 'development' ? { OTP: code } : {}) });
  } catch (error) { next(error); }
});

app.post('/members/:phoneNumber/email-verification/confirm', requireSession, async (req, res, next) => {
  try {
    const phoneNumber = memberPhone(req, res);
    if (!phoneNumber) return;
    const pending = emailOtps.get(phoneNumber);
    if (!pending || pending.expiresAt < Date.now() || pending.code !== String(req.body.otp || '')) return res.status(400).json({ message: 'The verification code is invalid or expired.' });
    const result = await xcode.post('MemberAccount/UpdateAccountVerify', { PhoneNumber: phoneNumber, Type: 'Email' });
    emailOtps.delete(phoneNumber);
    res.json(result);
  } catch (error) { next(error); }
});

app.post('/members/:phoneNumber/deactivate', requireSession, async (req, res, next) => {
  try {
    const phoneNumber = memberPhone(req, res);
    if (!phoneNumber) return;
    res.json(await xcode.post('MemberAccount/UpdateAccountStatusDeactive', { PhoneNumber: phoneNumber }));
  } catch (error) { next(error); }
});

app.get('/app/versions', async (_req, res, next) => {
  try { res.json(await xcode.get('ManageVersion/GetAllVersion')); } catch (error) { next(error); }
});

app.post('/members/:phoneNumber/profile', requireSession, async (req, res, next) => {
  try {
    const { phoneNumber } = req.params;
    const session = res.locals.session as MemberSession;
    const { name, email, birthday = '', imageByte = '' } = req.body;
    if (session.phoneNumber !== phoneNumber) return res.status(403).json({ message: 'You can only update your own profile.' });
    if (typeof name !== 'string' || name.trim().length < 2 || !validEmail(email)) return res.status(400).json({ message: 'Enter a valid name and email address.' });
    const member = await xcode.post('MemberAccount/MemberEditProfile', { PhoneNumber: phoneNumber, UserName: name.trim(), Email: email.trim(), Birthday: birthday, ImageByte: imageByte });
    res.json({ member: withoutPassword(member) });
  } catch (error) { next(error); }
});

app.post('/members/:phoneNumber/feedback', requireSession, async (req, res, next) => {
  try {
    const { phoneNumber } = req.params;
    const session = res.locals.session as MemberSession;
    const { description } = req.body;
    if (session.phoneNumber !== phoneNumber) return res.status(403).json({ message: 'You can only submit feedback for your own account.' });
    if (typeof description !== 'string' || !description.trim()) return res.status(400).json({ message: 'Enter feedback before sending.' });
    const member = await xcode.post('MemberDetails/GetMemberDetails', { PhoneNumber: phoneNumber });
    const record = Array.isArray(member) ? member[0] : member as Record<string, unknown>;
    const feedback = await xcode.post('FeedBack/CreateFeedback', { Title: 'Member app feedback', Description: description.trim(), Rating: '', Category: 'Member App', UserId: record?.UserId || '', Location: '' });
    res.status(201).json(feedback);
  } catch (error) { next(error); }
});

app.get('/members/:phoneNumber/dashboard', requireSession, async (req, res, next) => {
  try {
    const { phoneNumber } = req.params;
    const session = res.locals.session as MemberSession;
    if (session.phoneNumber && session.phoneNumber !== phoneNumber) return res.status(403).json({ message: 'You can only access your own member dashboard.' });
    const [member, wallet] = await Promise.all([
      xcode.post('MemberDetails/GetMemberDetails', { PhoneNumber: phoneNumber }),
      xcode.post('MemberWallet/MemberGetWalletDetails', { PhoneNumber: phoneNumber }),
    ]);
    const record = firstRecord(member);
    const referralCode = String(record.ReferralCode || '');
    const userId = String(record.UserId || '');
    const [rewards, stampProgramme, vouchers, history, outlets, notifications, redeemedRewards, addresses, highlights, activeStamps, usedStamps, referrals, feedbackHistory] = await Promise.all([
      xcode.get('MemberReward/GetRewards').catch(() => []),
      xcode.get('ManageStamp/GetAllStamps').catch(() => []),
      xcode.post('MemberVoucher/GetVoucherByPhone', { PhoneNumber: phoneNumber }).catch(() => []),
      xcode.post('History/GetAllRecordByPhoneNumber', { PhoneNumber: phoneNumber }).catch(() => []),
      xcode.get('ManageOutlets/GetAllOutlets').catch(() => []),
      xcode.post('MemberNotification/GetNotificationsFilterMember', { PhoneNumber: phoneNumber }).catch(() => []),
      xcode.post('MemberAccount/GetMemberReward', { PhoneNumber: phoneNumber }).catch(() => []),
      xcode.post('ManagemMemberAddress/GetAllMemberAddress', { PhoneNumber: phoneNumber }).catch(() => []),
      xcode.get('ManageHighlight/UserGetAllHighlight').catch(() => []),
      xcode.post('MemberAccount/GetMemberStampList', { PhoneNumber: phoneNumber }).catch(() => []),
      xcode.post('MemberAccount/GetMemberStampUsedRecord', { PhoneNumber: phoneNumber }).catch(() => []),
      referralCode ? xcode.post('MemberAccount/GetMemberDownlineList', { ReferralCode: referralCode }).catch(() => []) : Promise.resolve([]),
      userId ? xcode.post('FeedBack/GetFeedbackListFilterUser', { UserId: userId }).catch(() => []) : Promise.resolve([])
    ]);
    res.json({ member: withoutPassword(member), wallet, rewards, stampProgramme, vouchers, history, outlets, notifications, redeemedRewards, addresses, highlights, activeStamps, usedStamps, referrals, feedbackHistory });
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
