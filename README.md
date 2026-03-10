# Kal AI 🥗

> **Smart calorie tracking powered by AI + verified nutrition databases**
> A PWA built for iPhone — designed to feel like a native Apple Health app.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![Gemini](https://img.shields.io/badge/Google-Gemini%202.5%20Flash-4285F4?style=flat-square&logo=google)
![FatSecret](https://img.shields.io/badge/FatSecret-API-FF6600?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?style=flat-square)

---

## ✨ Features

| Feature | Description |
|---|---|
| 📸 **AI Meal Analysis** | Take a photo of your food — Gemini 2.5 Flash identifies items and portions, then FatSecret + OpenFoodFacts verify the real nutritional values |
| 🔍 **Multi-source Verification** | Nutrition data cross-referenced: FatSecret API → OpenFoodFacts → AI estimate fallback |
| 📊 **Per-item Breakdown** | See calories and macros for each ingredient with source badges (FatSecret, OpenFoodFacts, AI Estimate) |
| ⏳ **Live Progress Bar** | 3-step animated progress during analysis: Identifying → Verifying → Finalizing |
| 🥩 **Ingredient Builder** | Select ingredients from categorized dropdowns (grains, meat, fish, vegetables, etc.) with gram inputs |
| 🍪 **Common Snacks** | Save packaged snacks by photographing the nutrition label — AI reads per-serving macros. Quick-log later with a tap + quantity picker |
| 📊 **Daily Dashboard** | Circular calorie ring, macro progress bars, and a live meal list |
| 📈 **Weekly / Monthly Charts** | Area chart and bar chart showing calorie trends over time (Recharts) |
| 🏥 **Apple Health Aesthetic** | SF Pro font stack, iOS color palette, frosted-glass bottom nav, safe-area support |
| 🌍 **Bilingual** | Full English ↔ Portuguese toggle — food names, UI labels, and AI responses |
| 🔐 **Auth** | Email/password + Google OAuth via Supabase Auth |
| 💬 **Feedback System** | In-app bug reports and feature requests with screenshot attachments |
| 📱 **Installable PWA** | `manifest.json` + service worker — add to Home Screen on iPhone |

---

## 🖼️ Screenshots

> _Install on iPhone for the best experience_

---

## 🗂️ Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Auth redirect root
│   ├── login/page.tsx              # Login + Sign Up + Google OAuth
│   ├── dashboard/page.tsx          # Today / Weekly / Monthly tabs
│   ├── log/page.tsx                # Meal logging (camera + ingredient builder + progress bar)
│   ├── snacks/page.tsx             # Common snacks manager + quick-log
│   ├── history/page.tsx            # Meal history grouped by date
│   ├── profile/page.tsx            # Settings, calorie goal, language, version info
│   └── api/
│       ├── analyze/route.ts        # Gemini meal analysis (identifies foods + portions)
│       ├── analyze-label/route.ts  # Gemini nutrition label reader
│       ├── nutrition-lookup/route.ts # FatSecret + OpenFoodFacts verification
│       └── feedback/route.ts       # Bug reports & feature requests (admin CRUD)
├── components/
│   ├── BottomNav.tsx               # iOS-style tab bar (5 tabs)
│   ├── CircularProgress.tsx        # SVG calorie ring
│   ├── FloatingActions.tsx         # Global FAB (+ log meal)
│   └── FeedbackWidget.tsx          # Floating feedback modal
├── context/
│   ├── AuthContext.tsx             # Supabase auth state
│   └── LanguageContext.tsx         # EN / PT i18n
└── lib/
    ├── supabase.ts                 # Supabase client + TypeScript types
    └── i18n.ts                     # Translation strings
```

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/MonoBL/Kal-AI.git
cd Kal-AI
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
FATSECRET_CLIENT_ID=your_fatsecret_client_id
FATSECRET_CLIENT_SECRET=your_fatsecret_client_secret
```

- **Supabase** → [supabase.com](https://supabase.com) — create a free project
- **Gemini** → [aistudio.google.com](https://aistudio.google.com) — get a free API key
- **FatSecret** → [platform.fatsecret.com](https://platform.fatsecret.com) — register for a free API key

### 3. Set up Supabase database

Run in **Supabase → SQL Editor**:

```sql
-- Profiles table
CREATE TABLE profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  email text,
  daily_goal_calories int4 DEFAULT 2000,
  preferred_language text DEFAULT 'en'
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Meals table
CREATE TABLE meals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  description text,
  calories int4,
  protein int4,
  carbs int4,
  fats int4,
  image_url text,
  meal_type text
);
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage own meals" ON meals FOR ALL USING (auth.uid() = user_id);

-- Common snacks table
CREATE TABLE common_snacks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  image_url text,
  serving_name text NOT NULL,
  serving_weight_g numeric NOT NULL,
  calories_per_serving numeric NOT NULL,
  protein_per_serving numeric NOT NULL,
  carbs_per_serving numeric NOT NULL,
  fats_per_serving numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE common_snacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage own snacks" ON common_snacks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Feedback table
CREATE TABLE feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  email text,
  type text CHECK (type IN ('bug', 'feature')),
  description text NOT NULL,
  screenshot_urls text[] DEFAULT '{}',
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own feedback" ON feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
```

Then create two **Storage buckets** (both set to **public**):
- `meal-images`
- `feedback-screenshots`

### 4. Run locally

```bash
npm run dev     # http://localhost:5050
npm run build   # production build
npm start       # production server
```

> **Note:** This project uses `--webpack` flag because `next-pwa` is incompatible with Turbopack. The flag is already set in `package.json`.

---

## 🤖 AI + API Strategy

### Meal Analysis Flow

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│  User Input  │ ──► │  Gemini 2.5 Flash │ ──► │  FatSecret  │
│  Photo/Items │     │  Identifies foods  │     │  Verifies   │
│  + Grams     │     │  + portions        │     │  nutrition  │
└──────────────┘     └──────────────────┘     └──────┬──────┘
                                                      │ fallback
                                               ┌──────▼──────┐
                                               │ OpenFoodFacts│
                                               │  (free DB)   │
                                               └──────┬──────┘
                                                      │ fallback
                                               ┌──────▼──────┐
                                               │ Gemini Est.  │
                                               │ (AI backup)  │
                                               └─────────────┘
```

1. **Step 1 — Gemini Vision**: Identifies individual food items, estimates portions from photo/description
2. **Step 2 — FatSecret API**: Looks up each food for verified per-100g nutritional data
3. **Step 3 — OpenFoodFacts**: Free fallback if FatSecret has no match
4. **Step 4 — Gemini Estimate**: Last resort using AI training data

Each item in the result shows a **source badge** so the user knows where the data came from.

### Nutrition Label Reader (`/api/analyze-label`)
- Reads all columns on a nutrition label (per 100g, per serving, per pack)
- Identifies the **individual serving** (1 cookie, 1 bar) — not per 100g or the full pack
- Returns per-serving and per-100g values for user verification
- Supports optional context (e.g. "pack of 4 cookies") for better accuracy

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| AI Vision | Google Gemini 2.5 Flash |
| Nutrition Data | FatSecret API + OpenFoodFacts |
| Charts | Recharts |
| PWA | next-pwa |
| Language | TypeScript |

---

## 📱 Install as iPhone PWA

1. Open the app in **Safari on iPhone**
2. Tap the **Share** button
3. Tap **Add to Home Screen**
4. The app runs in standalone mode (no browser UI)

---

## 📄 License

MIT © [MonoBL](https://github.com/MonoBL)
