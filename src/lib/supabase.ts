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
};
