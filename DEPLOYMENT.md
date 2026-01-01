# 🚀 KharchAI - Free Deployment Guide

Deploy your entire application **100% FREE** using Vercel + Neon PostgreSQL.

---

## 📋 Prerequisites

- GitHub account (free)
- Vercel account (free) - sign up at https://vercel.com
- Neon account (free) - sign up at https://neon.tech

---

## Step 1: Push Code to GitHub

### 1.1 Create a GitHub Repository

1. Go to https://github.com/new
2. Name it `kharchai` or `budget-app`
3. Set to **Public** or **Private** (your choice)
4. **DON'T** initialize with README (we already have code)
5. Click "Create repository"

### 1.2 Push Your Code

Run these commands in your project directory:

```bash
# Add all files
git add .

# Commit
git commit -m "Initial commit - KharchAI app"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/kharchai.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 2: Set Up Free PostgreSQL Database (Neon)

### 2.1 Create Neon Account

1. Go to https://neon.tech
2. Click "Sign Up" (use GitHub for easy login)
3. It's **completely free** - no credit card required

### 2.2 Create a Database

1. After login, click "Create Project"
2. **Project name**: `kharchai-db`
3. **Database name**: `kharchai`
4. **Region**: Choose closest to your users (US East, Europe, Asia)
5. Click "Create Project"

### 2.3 Get Database Connection String

1. After creation, you'll see a connection string like:
   ```
   postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/kharchai?sslmode=require
   ```
2. **Copy this entire string** - you'll need it for Vercel
3. **IMPORTANT**: Add `?sslmode=require` at the end if not present

---

## Step 3: Deploy to Vercel

### 3.1 Sign Up for Vercel

1. Go to https://vercel.com
2. Click "Sign Up"
3. **Choose "Continue with GitHub"** (easiest option)
4. Authorize Vercel to access your repositories

### 3.2 Import Your Project

1. Click "Add New..." → "Project"
2. Find your `kharchai` repository
3. Click "Import"

### 3.3 Configure Build Settings

Vercel will auto-detect Next.js. Keep these settings:

- **Framework Preset**: Next.js
- **Root Directory**: `./`
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### 3.4 Add Environment Variables

Click "Environment Variables" and add these:

| Name | Value | Where to get it |
|------|-------|----------------|
| `DATABASE_URL` | Your Neon connection string | From Step 2.3 |
| `NEXTAUTH_SECRET` | Generate below | Run command below |
| `NEXTAUTH_URL` | Leave blank for now | Will auto-set |
| `ANTHROPIC_API_KEY` | (Optional) Your API key | https://console.anthropic.com |

**To generate NEXTAUTH_SECRET**, run this on your computer:
```bash
openssl rand -base64 32
```
Copy the output and paste as `NEXTAUTH_SECRET` value.

### 3.5 Deploy!

1. Click "Deploy"
2. Wait 2-3 minutes
3. You'll get a URL like: `https://kharchai-xyz.vercel.app`

---

## Step 4: Run Database Migrations

After deployment, you need to set up the database tables.

### 4.1 Install Vercel CLI (one-time)

```bash
npm install -g vercel
```

### 4.2 Login to Vercel

```bash
vercel login
```

### 4.3 Link Your Project

```bash
cd /Users/rajeshchityal/Rajesh/AI/Projects/Budget
vercel link
```

Select your project when prompted.

### 4.4 Pull Environment Variables

```bash
vercel env pull .env
```

This downloads your production environment variables locally.

### 4.5 Run Migrations

```bash
npx prisma migrate deploy
```

This creates all database tables in your Neon database.

---

## Step 5: Update NEXTAUTH_URL

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Click on your `kharchai` project
3. Go to "Settings" → "Environment Variables"
4. Edit `NEXTAUTH_URL` and set it to your production URL:
   ```
   https://your-app-name.vercel.app
   ```
5. Click "Save"
6. Go to "Deployments" tab
7. Click "Redeploy" on the latest deployment

---

## Step 6: Test Your Deployment

1. Visit your URL: `https://your-app-name.vercel.app`
2. You should see the landing page
3. Click "Sign Up" and create an account
4. Test the app features!

---

## 🎉 You're Live!

Your app is now deployed and running 100% free on:
- **Vercel** (hosting, unlimited bandwidth)
- **Neon** (PostgreSQL database, 512MB)
- **Free SSL/HTTPS** automatically
- **Auto-deployments** on every git push

---

## 🔄 How to Update Your App

After making changes:

```bash
# Commit changes
git add .
git commit -m "Your update message"

# Push to GitHub
git push

# Vercel auto-deploys! 🎉
```

---

## 🆓 Free Tier Limits

### Vercel Free Tier:
- ✅ Unlimited projects
- ✅ Unlimited bandwidth
- ✅ 100 GB-hours compute time/month (more than enough)
- ✅ Automatic SSL
- ✅ Custom domains (you can add your own domain later)

### Neon Free Tier:
- ✅ 512 MB storage
- ✅ Unlimited queries
- ✅ Auto-scaling (pauses when inactive)
- ✅ 1 project

**This is plenty for:**
- 1,000+ users
- Millions of page views
- Personal projects
- MVP testing
- Portfolio showcases

---

## 🔧 Troubleshooting

### "Database connection failed"
- Check your `DATABASE_URL` in Vercel environment variables
- Make sure it ends with `?sslmode=require`
- Verify Neon database is active (it auto-pauses after inactivity)

### "Authentication not working"
- Make sure `NEXTAUTH_URL` matches your production URL
- Verify `NEXTAUTH_SECRET` is set
- Redeploy after changing environment variables

### "Build failed"
- Check build logs in Vercel dashboard
- Make sure `npm run build` works locally
- Check for TypeScript errors

### "API routes return 500"
- Check Vercel function logs: Dashboard → Your Project → Logs
- Verify database migrations ran: `npx prisma migrate deploy`
- Check environment variables are set correctly

---

## 📊 Monitoring Your App

### Vercel Analytics (Free):
1. Go to your project in Vercel
2. Click "Analytics" tab
3. See page views, performance, and more

### Neon Monitoring:
1. Go to https://console.neon.tech
2. Click your project
3. See database size, queries, and connection stats

---

## 🚀 Next Steps (Optional)

### Add a Custom Domain (Free with Vercel):
1. Buy a domain from Namecheap, GoDaddy, etc. (~$10/year)
2. In Vercel: Settings → Domains → Add Domain
3. Follow DNS instructions
4. Your app is now at `www.yourapp.com`!

### Enable AI Features:
1. Get Anthropic API key: https://console.anthropic.com
2. Add `ANTHROPIC_API_KEY` to Vercel environment variables
3. Redeploy
4. AI Chat will now work!

### Add File Upload:
1. Sign up for Vercel Blob: https://vercel.com/docs/storage/vercel-blob
2. Or use Cloudinary (free tier): https://cloudinary.com
3. Add storage credentials to environment variables

---

## 💡 Tips

- **Vercel auto-deploys** on every git push to main branch
- **Preview deployments**: Push to other branches for preview URLs
- **Rollback**: Click any previous deployment to rollback instantly
- **Logs**: Check Vercel function logs for debugging
- **Database backups**: Neon auto-backs up your database

---

## 📚 Resources

- Vercel Docs: https://vercel.com/docs
- Neon Docs: https://neon.tech/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Prisma with Neon: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel

---

## ✅ Checklist

- [ ] Code pushed to GitHub
- [ ] Neon database created
- [ ] Database URL copied
- [ ] Vercel project created
- [ ] Environment variables set
- [ ] Deployed successfully
- [ ] Database migrations ran
- [ ] NEXTAUTH_URL updated
- [ ] Tested signup/login
- [ ] Tested app features

---

**Congratulations! Your app is now live and free! 🎉**

Share your URL: `https://your-app-name.vercel.app`
