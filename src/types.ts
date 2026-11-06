// Mirrors backend/app/schemas/admin.py and the recipe contracts (API_SPEC §2.8, §2.9, §10).

export const RECIPE_CATEGORIES = ["soup", "side", "main", "simple", "sauce"] as const;
export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];
export type RecipeStatus = "importing" | "needs_review" | "saved" | "failed";

export const CATEGORY_LABELS: Record<RecipeCategory, string> = {
  soup: "국",
  side: "반찬",
  main: "메인",
  simple: "간단",
  sauce: "소스",
};

export const STATUS_LABELS: Record<RecipeStatus, string> = {
  importing: "수집 중",
  needs_review: "확인 필요",
  saved: "저장 완료",
  failed: "수집 실패",
};

export const UNIT_DIMENSIONS = ["mass", "volume", "count", "unmeasured"] as const;
export type UnitDimension = (typeof UNIT_DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<UnitDimension, string> = {
  mass: "질량 (g)",
  volume: "부피 (ml)",
  count: "개수",
  unmeasured: "계량 없음",
};

/** Dimensions whose `toBaseFactor` must be null (DB `units_to_base_factor_check`). */
export const FACTORLESS_DIMENSIONS: readonly UnitDimension[] = ["count", "unmeasured"];

/** `AdminUnit` from `GET /admin/units` (API_SPEC §10.1). */
export interface Unit {
  code: string;
  label: string;
  dimension: UnitDimension;
  toBaseFactor: number | null;
  aliases: string[];
}

export interface UnitUpdateInput {
  label: string;
  dimension: UnitDimension;
  toBaseFactor: number | null;
  aliases: string[];
}

export interface UnitCreateInput extends UnitUpdateInput {
  code: string;
}

export interface AdminSubstitute {
  id: string;
  ingredientId: string;
  substituteIngredientId: string;
  substituteName: string;
  priority: number;
  ratioLabel: string | null;
  factor: number | null;
  unit: string | null;
  unitLabel: string | null;
  tasteDifference: string;
  cookingChange: string | null;
  caution: string | null;
  uncertain: boolean;
  sourceVersion: string;
  inUse: boolean;
}

export interface AdminIngredient {
  id: string;
  name: string;
  normalizedName: string;
  recipeCount: number;
  substitutes: AdminSubstitute[];
}

export interface AdminIngredientPage {
  items: AdminIngredient[];
  total: number;
}

export interface SubstituteInput {
  substituteIngredientId?: string | null;
  substituteName?: string | null;
  priority: number;
  ratioLabel?: string | null;
  factor?: number | null;
  unit?: string | null;
  tasteDifference: string;
  cookingChange?: string | null;
  caution?: string | null;
  uncertain: boolean;
}

export interface RecipeIngredient {
  id: string;
  ingredientId: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  rawAmount?: string | null;
}

export interface Recipe {
  id: string;
  sourceUrl: string | null;
  title: string | null;
  imageUrl: string | null;
  status: RecipeStatus;
  category: RecipeCategory | null;
  baseServings: number | null;
  cookMinutes: number | null;
  ingredients: RecipeIngredient[];
  steps: string[];
  uncertainFields: string[];
  failureReason: string | null;
  createdAt: string;
}

export interface RecipeIngredientInput {
  id?: string | null;
  name: string;
  amount?: string | null;
}

export interface RecipeInput {
  title: string;
  category: RecipeCategory | null;
  baseServings: number | null;
  cookMinutes: number | null;
  ingredients: RecipeIngredientInput[];
  steps: string[];
  sourceUrl?: string | null;
  imageUrl?: string | null;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}
