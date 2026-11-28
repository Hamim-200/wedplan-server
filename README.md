# WedPlan: Wedding Planning Platform (Server)

Express.js and MongoDB API for WedPlan. It handles JWT verification, role-based access, services, bookings, uploads, admin tools and Stripe payments.

## Live Links

- **Live API:** https://wedplan-server-gules-seven.vercel.app (health check: `/api/health`)
- **Live website:** https://wedplan-client-beta.vercel.app
- **Server repository:** https://github.com/Hamim-200/wedplan-server
- **Client repository:** https://github.com/Hamim-200/wedplan-client

## Important Features

- JWT verification with Better Auth public keys (invalid or expired tokens return 401)
- Role middleware for Admin, Vendor and Customer (wrong role returns 403)
- The user, role and blocked status are always read from the database, never trusted from the client
- Ownership checks on every update and delete
- Services CRUD with free plan limit (3 active services) and admin approval
- Public browse API with search, filters, price sorting and pagination
- Bookings with duplicate prevention and atomic accept, reject and cancel rules
- ImgBB image upload through the server, so the API key stays secret
- Stripe Checkout (subscription) with a signature-verified webhook that activates Premium
- Premium expiry and cancellation handling
- Zod validation, central error handling, Helmet, CORS, rate limiting, compression and MongoDB indexes

## Technology Stack

Node.js, Express 5, TypeScript, MongoDB (native driver), jose, Zod, Stripe, Multer, Helmet, express-rate-limit.

## Installation

Requirements: Node.js 20 or newer and a MongoDB Atlas database.

```bash
git clone https://github.com/Hamim-200/wedplan-server.git
cd wedplan-server
npm install
```

Create a `.env` file in the project root (see `.env.example`):

| Variable | Description |
|---|---|
| `PORT` | Server port, `5000` |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `DB_NAME` | Database name, `wedplan` |
| `CLIENT_URL` | Client URL (used for CORS and Stripe redirects) |
| `BETTER_AUTH_URL` | Client URL (used to verify JWTs) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `IMGBB_API_KEY` | ImgBB API key |

Never commit the `.env` file.

## How to Run the Project Locally

```bash
npm run dev
```

The API runs on http://localhost:5000. Check http://localhost:5000/api/health.

Build and start in production mode:

```bash
npm run build
npm start
```

### Stripe webhook locally

```bash
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,invoice.paid,invoice.payment_failed,customer.subscription.updated,customer.subscription.deleted --forward-to localhost:5000/api/payments/webhook
```

Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET` and restart the server.

## API Overview

| Area | Base path | Access |
|---|---|---|
| Health | `/api/health` | Public |
| Public services | `/api/services` | Public (details need login) |
| Uploads | `/api/upload` | Logged in |
| Users and profile | `/api/users` | Logged in |
| Vendor services | `/api/vendor/services` | Vendor |
| Vendor bookings and stats | `/api/vendor/bookings`, `/api/vendor/stats` | Vendor |
| Customer bookings | `/api/customer/bookings` | Customer |
| Payments | `/api/payments` | Vendor (webhook: Stripe signature) |
| Admin | `/api/admin/services`, `/users`, `/stats`, `/transactions` | Admin |

## Deployment

Deployed on Vercel as a serverless function (`api/index.js` loads the compiled Express app from `dist`). Set all environment variables in Vercel. In Stripe, create a webhook endpoint at `/api/payments/webhook` and use its signing secret.