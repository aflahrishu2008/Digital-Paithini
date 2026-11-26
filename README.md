# Digital Paithini

A private, mobile-first shared file management web application for a small group of up to 5 members. All authenticated members share one workspace with equal permissions.

## Features

- **Username & Password Login** backed by Supabase Auth
- **Shared Folder & File Space** (`Minutes`, `Reports`, `Members List`, `Books`, `Sahithyotsav` seeded initially, fully editable)
- **Nested Folders** with breadcrumb navigation
- **File Upload, Preview, Download, Rename & Delete** (PDF, JPG/PNG, DOC/DOCX, XLS/XLSX, and more)
- **Live Sync** via Supabase Realtime so changes appear for all 5 members
- **Instant Search** across folder and file names
- **Mobile-First & PWA-Ready** (touch-friendly buttons, bottom sheets, Add to Home Screen support)

---

## 1. Supabase Setup (₹0/month Free Tier)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/schema.sql`](./supabase/schema.sql).
   - Creates `public.items` table with Row Level Security (`authenticated` only)
   - Creates private storage bucket `digital-paithini-files` (`public = false`) with `authenticated` policies
   - Seeds the 5 initial folders (`Minutes`, `Reports`, `Members List`, `Books`, `Sahithyotsav`)
3. Enable Realtime (optional, for instant updates across members):
   - In Supabase Dashboard → **Database → Replication**, enable replication for `public.items`.
4. Add your up to **5 authorized members**:
   - Go to **Authentication → Users → Add user → Create new user**.
   - Use `<username>@digitalpaithini.local` as the email (for example `rahul@digitalpaithini.local`, `asha@digitalpaithini.local`) and set their password.
   - Check **Auto Confirm User**.
   - Members can then log in with just their **Username** (e.g. `rahul`) and **Password**.
5. Copy `.env.example` to `.env` and fill in your Supabase URL and Anon Key from **Project Settings → API**:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_BUCKET=digital-paithini-files
VITE_AUTH_EMAIL_DOMAIN=digitalpaithini.local
```

> **Note:** If `.env` is not configured yet, the app starts in **Local Preview Mode** (`member1` / `paithini123`) using browser storage so you can preview the UI locally before connecting Supabase.

---

## 2. Run Locally

```bash
npm install
npm run dev
```

## 3. Build & Deploy

### Option A: GitHub Pages (Included Workflow)
1. Push this repository to GitHub (`main` branch).
2. In GitHub Repository → **Settings → Pages → Source**, choose **GitHub Actions**.
3. (For live Supabase sync) Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Settings → Secrets and variables → Actions → Secrets**.
4. The workflow in `.github/workflows/deploy-pages.yml` automatically runs tests, builds `./dist` with relative paths (`base: './'`), and publishes to GitHub Pages.

> **Note on Private Repositories:** GitHub Pages on a **private** repository requires **GitHub Pro, Team, or Enterprise**. On a **GitHub Free** account, GitHub Pages requires the repository to be **Public** — or you can keep the repository private and connect it to **Netlify** or **Cloudflare Pages** (₹0/month free tier).

### Option B: Netlify Free Tier
1. Connect your private GitHub repository in Netlify or drag-and-drop `dist/` after `npm run build`.
2. In Netlify, set Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_BUCKET`, `VITE_AUTH_EMAIL_DOMAIN`).
3. `netlify.toml` is already configured with `npm run build`, publish directory `dist`, and SPA fallback routing.
