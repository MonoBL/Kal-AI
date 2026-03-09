# Kal AI 🥗

> **Smart calorie tracking powered by Google Gemini AI**
> A PWA built for iPhone — designed to feel like a native Apple Health app.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![Gemini](https://img.shields.io/badge/Google-Gemini%202.5%20Flash-4285F4?style=flat-square&logo=google)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?style=flat-square)

---

## ✨ Features

| Feature | Description |
|---|---|
| 📸 **AI Meal Analysis** | Take a photo of your food — Gemini 2.5 Flash identifies it, estimates portion size, and returns calories + macros |
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
│   ├── log/page.tsx                # Meal logging (camera + ingredient builder)
│   ├── snacks/page.tsx             # Common snacks manager + quick-log
│   ├── history/page.tsx            # Meal history grouped by date
│   ├── profile/page.tsx            # Settings, calorie goal, language, version info
│   └── api/
│       ├── analyze/route.ts        # Gemini meal analysis endpoint
│       ├── analyze-label/route.ts  # Gemini nutrition label reader
│       └── feedback/route.ts       # Bug reports & feature requests
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
GEMINI_API_KEY=your_gemini_api_key
```

- **Supabase** → [supabase.com](https://supabase.com) — create a free project
- **Gemini** → [aistudio.google.com](https://aistudio.google.com) — get a free API key

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
  image_url text
);
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage own meals" ON meals FOR ALL USING (auth.uid() = user_id);
```

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
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own feedback" ON feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
```

Then create a **Storage bucket** named `meal-images` (set to **public**).
Also create a **Storage bucket** named `feedback-screenshots` (set to **public**).

### 4. Run locally

```bash
npm run dev     # http://localhost:5050
npm run build   # production build
npm start       # production server
```

> **Note:** This project uses `--webpack` flag because `next-pwa` is incompatible with Turbopack. The flag is already set in `package.json`.

---

## 🤖 AI Strategy

**Meal Analysis** (`/api/analyze`):
- If the user provides **grams** (e.g. `200g Chicken Breast, 150g White Rice`), those values are used as ground truth
- If the user provides a **photo only**, Gemini estimates portion size from plate/cutlery scale
- Considers **cooking methods** (oil sheen → fried, matte → grilled/boiled)
- Returns structured JSON: `dish_name`, `total_calories`, `macros`, `confidence_score`, `detailed_analysis`

**Nutrition Label Reader** (`/api/analyze-label`):
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
| AI | Google Gemini 2.5 Flash |
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
