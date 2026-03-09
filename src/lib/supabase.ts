import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  daily_goal_calories: number;
  preferred_language: "pt" | "en";
};

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type Meal = {
  id: string;
  user_id: string;
  created_at: string;
  image_url?: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meal_type?: MealType;
};

export type CommonSnack = {
  id: string;
  user_id: string;
  name: string;
  image_url?: string;
  serving_name: string;       // e.g. "1 cookie (50g)", "1 pack (4 cookies, 200g)"
  serving_weight_g: number;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fats_per_serving: number;
  created_at: string;
};

export type Feedback = {
  id: string;
  user_id: string | null;
  email: string | null;
  type: "bug" | "feature";
  description: string;
  screenshot_urls: string[];
  status: "open" | "in_progress" | "resolved";
  created_at: string;
};
