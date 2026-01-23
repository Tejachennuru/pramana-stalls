# Pramana Stalls Auction App 🏫

A secure, premium auction portal for Pramana Event Stalls.
Built with **HTML/CSS/JS**, **Supabase**, and **Cloudflare Pages**.

## 🚀 Quick Start Guide


### 1. Running Locally (Development)
Since this is a vanilla JS app using ES Modules, you cannot just open `index.html` in the file explorer. You need a local server.
Run this in the terminal:
```bash
npx serve .
```
Then open the URL shown (usually `http://localhost:3000`).

### 2. Supabase Setup
1. Create a new Supabase project.
2. Go to **Authentication > Providers** and enable **Google**.
3. Go to **SQL Editor** and run the contents of `supabase/schema.sql`.
4. Get your **Project URL** and **Anon Key** from Project Settings > API.

### 2. Connect Frontend
1. Open `assets/js/supabase.js`.
2. Replace `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_ANON_KEY` with your actual credentials.

### 3. Deploy Edge Functions
1. Login to Supabase:
   ```bash
   npx supabase login
   ```
2. Link your project (Find Reference ID in Settings > General, e.g., `drrbqkym...`):
   ```bash
   npx supabase link --project-ref your-project-id
   ```
3. Deploy functions: 
   ```bash
   npx supabase functions deploy submit-bid --no-verify-jwt
   npx supabase functions deploy select-winner --no-verify-jwt
   ```
4. **Set Email Secret** (Required for emails):
   - Sign up at [Resend.com](https://resend.com) (Free Tier).
   - Create an API Key.
   - Run this command:
     ```bash
     npx supabase secrets set RESEND_API_KEY=re_123456...
     ```

### 4. Deploy Frontend (Cloudflare Pages)
**Option A: Drag & Drop (Easiest)**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) > **Workers & Pages**.
2. Click **Create Application** > **Pages** > **Upload Assets**.
3. Name your project (e.g., `pramana-stalls`).
4. Drag and drop this entire project folder (`pramana-stalls`).
5. Click **Deploy**.

**Option B: Connect via Git (Recommended)**
1. Push this code to a GitHub repository.
2. In Cloudflare Dashboard, select **Connect to Git**.
3. Select your repository.
4. **Build Settings**:
   - **Framework Preset**: None / Static HTML
   - **Build Command**: (Leave Empty)
   - **Build Output Directory**: `/` (or leave empty if root)
5. Click **Save and Deploy**.

## 📂 Project Structure
- `index.html`: Main landing page.
- `assets/`: CSS, JS, and Images.
- `supabase/`: SQL Schema and Edge Functions.

## 🎨 Features
- **Premium UI**: Gold/Black aesthetic with animations.
- **Secure Bidding**: Validates base price server-side.
- **Automated Winners**: Cron job selects highest bidder.
- **RLS Protected**: Database is secure by design.
