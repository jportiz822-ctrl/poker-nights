# Deploy Poker Nights — step-by-step

This guide takes you from zero to a live URL your boys can install. Total time: about 30 minutes the first time. **Cost: $0/month.**

You&apos;ll set up three free accounts and copy/paste a few values between them. No coding required. If you get stuck on any step, send me what you see and I&apos;ll fix it.

---

## 1. Create the three accounts

Open each in a tab — don&apos;t close them, you&apos;ll come back to all three.

1. **GitHub** — https://github.com/signup
   - Sign up with your email. Confirm the email.
2. **Supabase** — https://supabase.com/sign-up
   - Click **Continue with GitHub**.
3. **Vercel** — https://vercel.com/signup
   - Click **Continue with GitHub**.

---

## 2. Set up the database (Supabase)

1. In Supabase, click **New project**.
   - **Name:** `poker-nights`
   - **Database password:** click "Generate" and save it somewhere safe (you won&apos;t need it day-to-day, but write it down).
   - **Region:** pick the one closest to you (e.g. East US).
   - **Plan:** Free.
   - Click **Create new project**. Wait ~2 minutes for it to provision.

2. Once it&apos;s ready, open the **SQL Editor** (left sidebar, the icon that looks like `>_`).
   - Click **New query**.
   - Open the file `supabase/schema.sql` from this project, copy **everything** in it.
   - Paste it into the SQL editor.
   - Click **Run** (bottom-right). You should see "Success. No rows returned."

3. Open **Authentication** → **Providers** in the sidebar.
   - **Email** is enabled by default. Good.
   - Make sure **Confirm email** is **OFF** (so magic links work without a confirmation step). It&apos;s under **Email** → settings.

4. Open **Authentication** → **URL Configuration**.
   - **Site URL:** leave blank for now (you&apos;ll fill in after Vercel deploy).
   - We&apos;ll come back to this.

5. Open **Project Settings** (gear icon) → **API**.
   - You&apos;ll see three values you need to copy. Keep this tab open.
     - **Project URL** (looks like `https://abcdxyz.supabase.co`)
     - **Project API keys → anon public** (a long string)
     - **Project API keys → service_role** (another long string — **secret!** never share)

---

## 3. Push the code to GitHub

You&apos;ll do this from PowerShell on your computer. Open PowerShell and run these one at a time.

```powershell
cd C:\Users\jport\Documents\poker-nights
git init
git add .
git commit -m "Initial commit"
```

Now create a repo on GitHub and push:

1. Go to https://github.com/new
2. **Repository name:** `poker-nights`
3. **Private** (recommended).
4. **Don&apos;t** initialize with README, .gitignore, or license — leave everything unchecked.
5. Click **Create repository**.
6. GitHub shows you a page with commands. Run the two commands under **"…or push an existing repository from the command line"** in PowerShell:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/poker-nights.git
git branch -M main
git push -u origin main
```

If git asks for a username/password, the password is a **personal access token** (GitHub no longer accepts your real password):
- https://github.com/settings/tokens/new — name it "poker-nights", check **repo** scope, generate, copy the token, paste it as the password.

---

## 4. Generate VAPID keys (for push notifications)

In the same PowerShell window, run:

```powershell
npm install
npm run gen:vapid
```

This prints three lines. Copy them — you&apos;ll paste them into Vercel in the next step.

---

## 5. Deploy on Vercel

1. Go to https://vercel.com/new.
2. Find your `poker-nights` repo and click **Import**.
3. **Framework preset:** Next.js (auto-detected).
4. **Root directory:** leave as `.`.
5. Open **Environment Variables** and add these one by one (copy/paste from Supabase + the VAPID output):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | (Supabase Project URL) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (Supabase anon public key) |
   | `SUPABASE_SERVICE_ROLE_KEY` | (Supabase service_role key) |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | (from gen:vapid) |
   | `VAPID_PRIVATE_KEY` | (from gen:vapid) |
   | `VAPID_SUBJECT` | `mailto:your-real-email@example.com` |
   | `CRON_SECRET` | (any random string — make one up, like `abc123xyz789`) |
   | `NEXT_PUBLIC_SITE_URL` | leave blank for now, we&apos;ll fill it in |
   | `GAME_TIMEZONE` | `America/New_York` (or your zone — see bottom of file) |

6. Click **Deploy**. It builds for ~2 minutes.

7. When it finishes, you&apos;ll see your live URL — something like `https://poker-nights-abc.vercel.app`. Copy it.

8. Click **Settings → Environment Variables**, edit `NEXT_PUBLIC_SITE_URL`, paste your live URL. Then **Deployments → … → Redeploy** so the change takes effect.

---

## 6. Tell Supabase about your live URL

Back in Supabase → **Authentication → URL Configuration**:

- **Site URL:** paste your Vercel URL (e.g. `https://poker-nights-abc.vercel.app`)
- **Redirect URLs:** add `https://poker-nights-abc.vercel.app/auth/callback`
- Click **Save**.

This lets the magic-link emails redirect back to your live site.

---

## 7. Make yourself the first admin

Open Supabase → **Table Editor** → `players` → **Insert row**.

- `email`: your email (lowercase)
- `display_name`: your name
- `is_admin`: ✅ true
- `is_active`: ✅ true

Save.

Now visit your live URL, click **Sign in**, type your email, hit "Send magic link". Check your email (look in spam if needed), tap the link → you&apos;re in.

---

## 8. Add the rest of the crew

In the app, go to **Admin → Roster** and add players one at a time. They&apos;ll be able to sign in immediately.

Or, faster: in Supabase → Table Editor → `players`, paste in 30 rows at once via the SQL editor:

```sql
insert into players (email, display_name) values
  ('mike@example.com', 'Mike'),
  ('joe@example.com',  'Joe'),
  ('sarah@example.com','Sarah');
-- add as many as you want
```

---

## 9. Send the install link

Drop this in your iMessage group:

> 🎲 New poker app: **https://YOUR-VERCEL-URL**
>
> Open it on your iPhone in Safari, tap **Share → Add to Home Screen**, then tap the icon. Sign in with your email — you should already be on the roster.

When they open it the first time and sign in, the app prompts them to enable notifications. Once they tap Allow, they&apos;ll get the Monday reminders and the "GAME LIVE" alerts.

---

## Troubleshooting

**Magic-link email never arrives.** Check spam. Also: Supabase Free tier rate-limits to 4 emails/hour by default. For 30 players signing in over a few days that&apos;s fine, but if everyone signs up at once you may hit the limit. In Supabase → Authentication → SMTP Settings you can plug in your own free SMTP (e.g. Resend, SendGrid free) for unlimited.

**Push notifications not firing.** Push only works after the player has installed the app to their home screen AND tapped "Enable notifications". On iOS the device must be on iOS 16.4+ for web push. Older iPhones won&apos;t get them.

**Reminder fires at the wrong time.** Default `GAME_TIMEZONE` is `America/New_York` and the cron is set to fire at 8pm ET (handles both EDT and EST). If you&apos;re in a different timezone:

- Change `GAME_TIMEZONE` to your IANA zone (e.g. `America/Chicago`, `America/Denver`, `America/Los_Angeles`)
- Edit `vercel.json`, change the cron `schedule` so the UTC times correspond to 8pm in your zone:
  - Central: `"0 1,2 * * *"`
  - Mountain: `"0 2,3 * * *"`
  - Pacific: `"0 3,4 * * *"`
- Commit & push, Vercel re-deploys automatically.

**Need to delete a session.** Go to Supabase → Table Editor → `sessions` → delete the row. The entries cascade-delete.

**Want to see all data raw.** Supabase → Table Editor — full read/write access for you as the database owner.
