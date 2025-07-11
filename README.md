# FinanceConverter - PDF to Excel Converter

A professional-grade finance PDF to Excel converter built with Next.js, featuring user authentication, subscription management, and secure file processing.

## Features

- 🔒 **Secure Authentication** - Google OAuth integration with NextAuth.js
- 💳 **Subscription Management** - Stripe integration for payments
- 📊 **Smart PDF Processing** - Advanced algorithms for extracting financial data
- 📈 **Usage Analytics** - Track conversions and user statistics
- 🎨 **Professional UI** - Clean, responsive design with Tailwind CSS
- 🚀 **Production Ready** - Built with best practices and scalability in mind

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes, MongoDB, Mongoose
- **Authentication**: NextAuth.js with Google OAuth
- **Payments**: Stripe
- **File Processing**: pdf-parse, ExcelJS
- **UI Components**: Lucide React icons, React Hot Toast

## Quick Start

### Prerequisites

- Node.js 18+ installed
- MongoDB database (local or Atlas)
- Google OAuth app credentials
- Stripe account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd finance-pdf-to-excel-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Update `.env.local` with your credentials:

   ```env
   # Database
   MONGODB_URI=your-mongodb-connection-string

   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-long-random-secret-key

   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # Stripe
   STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
   STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
   STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Configuration Guide

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to your `.env.local`

### Stripe Setup

1. Create a [Stripe account](https://stripe.com)
2. Get your API keys from the dashboard
3. Create products and prices in Stripe dashboard
4. Update `SUBSCRIPTION_PLANS` in `src/lib/stripe.js` with your price IDs
5. Set up webhook endpoint: `http://localhost:3000/api/webhooks/stripe`

## Usage

### Free Users (Anonymous)
- 5 conversions per day
- Basic PDF to Excel conversion
- No registration required

### Registered Users
- 5 conversions per day
- Conversion history
- Priority processing
- Email support

### Premium Subscribers
- Unlimited conversions
- Advanced features
- Priority support
- API access (Pro plan)

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
