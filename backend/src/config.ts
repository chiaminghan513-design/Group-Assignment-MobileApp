import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:8100,http://localhost:4200').split(','),
  appJwtSecret: required('APP_JWT_SECRET'),
  xcodeBaseUrl: (process.env.XCODE_API_BASE_URL || 'https://xcodeappapi.xcode.com.my/api').replace(/\/$/, ''),
  xcodeAuthPath: process.env.XCODE_AUTH_PATH || 'JWTToken/Post',
  xcodeAuthPayload: process.env.XCODE_AUTH_PAYLOAD || ''
};
