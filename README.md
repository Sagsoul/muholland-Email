# Muholland Email Forwarding Service

A serverless email forwarding service using Next.js and Resend webhooks, deployed on Sevalla.

## Features

- 🚀 Lightweight serverless deployment on Sevalla
- 📧 Automatic email forwarding with webhook verification
- 🔐 Secure signature verification for Resend webhooks
- 📎 Preserves attachments and original formatting
- 💬 Reply-to functionality (replies go back to original sender)
- 🛡️ Environment-based configuration

## Email Forwarding Rules

Currently configured to forward:

```
doug@muholland.com         → dougjaff@gmail.com
rura@muholland.com         → majrue4@gmail.com
anesu@muholland.com        → scratchedanddent@gmail.com
scratchedanddent@muholland.com → scratchedanddent@gmail.com
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- A Resend account (https://resend.com)
- A Gmail account (or another SMTP provider)
- Sevalla account (https://sevalla.com)

### 2. Local Setup

```bash
# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env.local

# Edit .env.local with your credentials
```

### 3. Configure Environment Variables

#### Get Resend Webhook Secret

1. Go to https://dashboard.resend.com/webhooks
2. Create a new webhook endpoint
3. Subscribe to `email.received` event type
4. Copy the signing secret
5. Add to `.env.local` as `RESEND_WEBHOOK_SECRET`

#### Gmail App Password Setup

1. Enable 2FA on your Google account: https://myaccount.google.com/account/two-step-verification
2. Go to https://myaccount.google.com/apppasswords
3. Select "Mail" and "Windows Computer" (or your device)
4. Copy the generated 16-character password
5. Use this as `SMTP_PASSWORD` in `.env.local` (NOT your Gmail password)

#### Example .env.local

```env
RESEND_WEBHOOK_SECRET=whsk_xxxxxxxxxxxx_xxxxxxxxxxxx
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
FORWARD_FROM_EMAIL=your-email@gmail.com
```

### 4. Local Testing

```bash
# Start development server
npm run dev

# Server runs on http://localhost:3000

# Test the endpoint
curl -X POST http://localhost:3000/api/webhooks/resend \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.received",
    "data": {
      "from": "sender@example.com",
      "to": "doug@muholland.com",
      "subject": "Test Email",
      "text": "This is a test email",
      "html": "<p>This is a test email</p>"
    }
  }'
```

### 5. Deploy to Sevalla

#### Step 1: Create Sevalla Project

1. Log in to https://sevalla.com
2. Click "New Project"
3. Select "Next.js" as the framework
4. Connect your GitHub repository (`muholland-Email`)
5. Click "Import"

#### Step 2: Add Environment Variables

In Sevalla dashboard:

1. Go to your project settings
2. Click "Environment Variables"
3. Add the following:
   - `RESEND_WEBHOOK_SECRET` = Your Resend webhook secret
   - `SMTP_HOST` = smtp.gmail.com
   - `SMTP_PORT` = 587
   - `SMTP_SECURE` = false
   - `SMTP_USER` = your-email@gmail.com
   - `SMTP_PASSWORD` = Your Gmail app password
   - `FORWARD_FROM_EMAIL` = your-email@gmail.com

4. Click "Save"

#### Step 3: Deploy

1. Sevalla automatically detects and deploys Next.js projects
2. Wait for the build to complete
3. You'll get a deployment URL (e.g., `https://muholland-email.sevalla.dev`)
4. Your service is live!

### 6. Configure Resend Webhook

1. Get your Sevalla deployment URL from the dashboard
2. Go to https://dashboard.resend.com/webhooks
3. Click "Create Endpoint"
4. Set URL to: `https://your-sevalla-url.sevalla.dev/api/webhooks/resend`
5. Select event: `email.received`
6. Copy the signing secret
7. Update your Sevalla environment variables with this secret
8. Sevalla will auto-redeploy when environment variables change

## How It Works

1. **Email arrives** at your Resend inbox (e.g., `doug@muholland.com`)
2. **Resend sends webhook** to your endpoint with email data
3. **Signature verified** using RESEND_WEBHOOK_SECRET (security)
4. **Forwarding rule checked** in FORWARDING_MAP
5. **Email forwarded** to destination (e.g., `dougjaff@gmail.com`)
6. **Reply-to set** to original sender so replies work seamlessly

## Troubleshooting

### Webhook not being received

- Check Resend webhook delivery logs: https://dashboard.resend.com/webhooks
- Verify webhook URL is correct in Resend dashboard
- Test with: `curl https://your-sevalla-url.sevalla.dev/api/webhooks/resend -X GET`
- Should return: `{"message":"Email forwarding webhook is running"}`

### Email not forwarding

```bash
# Check Sevalla logs
# In Sevalla dashboard: Project → Logs

# Common issues:
# - SMTP credentials incorrect
# - SMTP_PASSWORD is Gmail password instead of app password
# - FORWARDING_MAP doesn't have rule for the email
# - Signature verification failed (RESEND_WEBHOOK_SECRET mismatch)
```

### Gmail SMTP Connection Issues

- Make sure 2FA is enabled
- Generate new app password: https://myaccount.google.com/apppasswords
- Use the 16-character password (without spaces)
- Ensure "Less secure app access" is not blocking (not needed with app passwords)

## Adding More Forwarding Rules

Edit `app/api/webhooks/resend/route.ts` and update the `FORWARDING_MAP`:

```typescript
const FORWARDING_MAP: Record<string, string> = {
  'doug@muholland.com': 'dougjaff@gmail.com',
  'rura@muholland.com': 'majrue4@gmail.com',
  'anesu@muholland.com': 'scratchedanddent@gmail.com',
  'scratchedanddent@muholland.com': 'scratchedanddent@gmail.com',
  'newemail@muholland.com': 'forward-to@gmail.com', // Add here
};
```

Then push to GitHub:

```bash
git add .
git commit -m "Add new forwarding rule"
git push
# Sevalla auto-deploys when you push to main
```

## Security Considerations

- ✅ Webhook signatures are verified using HMAC-SHA256
- ✅ Environment variables stored securely in Sevalla
- ✅ Never commit `.env.local` to version control
- ✅ Use app passwords for Gmail, not your actual password
- ✅ SMTP password transmitted over TLS
- ✅ Endpoint returns 401 for invalid signatures

## API Endpoint

### POST `/api/webhooks/resend`

**Expected Headers:**
```
Content-Type: application/json
resend-signature: <signature>
```

**Expected Body:**
```json
{
  "type": "email.received",
  "data": {
    "from": "sender@example.com",
    "to": "doug@muholland.com",
    "subject": "Email Subject",
    "text": "Plain text body",
    "html": "<p>HTML body</p>",
    "attachments": []
  }
}
```

**Success Response (200):**
```json
{
  "status": "forwarded",
  "to": "dougjaff@gmail.com"
}
```

**Error Responses:**
- `401`: Invalid signature
- `500`: Processing error

## Monitoring & Logs

### Sevalla Dashboard
- Go to https://sevalla.com/dashboard
- Select your project
- View "Logs" and "Deployments"
- Real-time logs of webhook requests

### Resend Webhook Logs
- Go to https://dashboard.resend.com/webhooks
- Select your endpoint
- View delivery history and timestamps

## CI/CD with Sevalla

Sevalla automatically:
- Rebuilds on every push to main branch
- Runs `npm run build` 
- Starts with `npm run start`
- Manages SSL certificates
- Handles auto-scaling

## Support

For issues with:
- **Resend**: https://resend.com/support
- **Sevalla**: https://sevalla.com/support
- **Gmail SMTP**: https://support.google.com
