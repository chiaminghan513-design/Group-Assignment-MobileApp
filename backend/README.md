# Loyalty shared backend

This server is the single gateway for the member mobile app, member web app, merchant POS, and admin portal. It holds the Xcode Loyalty API authentication details and forwards only approved requests.

## Run locally

1. Copy `.env.example` to `.env`.
2. Set `APP_JWT_SECRET` to a long random string.
3. Ask the API owner for the exact `JWTToken/Post` credentials and request body, then set `XCODE_AUTH_PAYLOAD` to that JSON. Do not commit `.env`.
4. Run `npm install`, then `npm run dev`.

The backend starts at `http://localhost:3000`. Check it with `GET /health`.

## Current client routes

- `POST /auth/request-otp`
- `POST /auth/register-otp`
- `POST /auth/login/phone`
- `POST /auth/login/email`
- `POST /auth/register`
- `GET /members/:phoneNumber/dashboard` with `Authorization: Bearer <sessionToken>`

The Xcode authentication request body is intentionally environment-configured because the Swagger page does not document a safe set of test credentials.

Until test credentials are supplied, the server automatically uses development mode. It returns OTP `654321` for phone login and `123456` for registration; no SMS is sent. Set `USE_MOCK_XCODE=false` and configure `XCODE_AUTH_PAYLOAD` to use the real API.
