import type {
  AdminIngredient,
  AdminIngredientPage,
  ApiErrorBody,
  Recipe,
  RecipeCategory,
  RecipeInput,
  SubstituteInput,
  Unit,
  UnitCreateInput,
  UnitUpdateInput,
} from "./types";

export interface Connection {
  baseUrl: string;
  adminKey: string;
  /** Optional Supabase access token for user-scoped recipe APIs; empty = dev user (AUTH_MODE=dev). */
  userToken: string;
}

const STORAGE_KEY = "recipe-admin-connection";

export function loadConnection(): Connection {
  const fallback: Connection = {
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
    adminKey: "",
    userToken: "",
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<Connection>) } : fallback;
  } catch {
    return fallback;
  }
}

export function saveConnection(connection: Connection): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(connection));
  } catch {
    // Storage unavailable: keep the in-memory value only
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: ApiErrorBody,
  ) {
    super(body.message);
  }
}

async function request<T>(connection: Connection, path: string, init: RequestInit & { admin?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body) headers["Content-Type"] = "application/json";
  if (init.admin) headers["X-Admin-Key"] = connection.adminKey;
  else if (connection.userToken) headers.Authorization = `Bearer ${connection.userToken}`;

  let response: Response;
  try {
    response = await fetch(`${connection.baseUrl.replace(/\/$/, "")}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, { code: "network_error", message: "API 서버에 연결할 수 없습니다." });
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, body ?? { code: "server_error", message: `요청 실패 (HTTP ${response.status})` });
  }
  return body as T;
}

const json = (value: unknown) => JSON.stringify(value);

export const adminApi = {
  units: (c: Connection) => request<Unit[]>(c, "/admin/units", { admin: true }),
  createUnit: (c: Connection, input: UnitCreateInput) =>
    request<Unit>(c, "/admin/units", { admin: true, method: "POST", body: json(input) }),
  updateUnit: (c: Connection, code: string, input: UnitUpdateInput) =>
    request<Unit>(c, `/admin/units/${encodeURIComponent(code)}`, { admin: true, method: "PUT", body: json(input) }),
  deleteUnit: (c: Connection, code: string) =>
    request<void>(c, `/admin/units/${encodeURIComponent(code)}`, { admin: true, method: "DELETE" }),
  ingredients: (c: Connection, params: { query: string; offset: number; limit: number; withSubstitutes: boolean }) => {
    const qs = new URLSearchParams({
      limit: String(params.limit),
      offset: String(params.offset),
      withSubstitutes: String(params.withSubstitutes),
    });
    if (params.query.trim()) qs.set("query", params.query.trim());
    return request<AdminIngredientPage>(c, `/admin/ingredients?${qs}`, { admin: true });
  },
  ingredient: (c: Connection, id: string) => request<AdminIngredient>(c, `/admin/ingredients/${id}`, { admin: true }),
  createIngredient: (c: Connection, name: string) =>
    request<AdminIngredient>(c, "/admin/ingredients", { admin: true, method: "POST", body: json({ name }) }),
  createSubstitute: (c: Connection, ingredientId: string, input: SubstituteInput) =>
    request<AdminIngredient>(c, `/admin/ingredients/${ingredientId}/substitutes`, {
      admin: true,
      method: "POST",
      body: json(input),
    }),
  updateSubstitute: (c: Connection, id: string, input: SubstituteInput) =>
    request<AdminIngredient>(c, `/admin/substitutes/${id}`, { admin: true, method: "PUT", body: json(input) }),
  deleteSubstitute: (c: Connection, id: string) =>
    request<void>(c, `/admin/substitutes/${id}`, { admin: true, method: "DELETE" }),
};

export const recipeApi = {
  list: (c: Connection, category: RecipeCategory | null) =>
    request<Recipe[]>(c, category ? `/recipes?category=${category}` : "/recipes"),
  create: (c: Connection, input: RecipeInput) => request<Recipe>(c, "/recipes", { method: "POST", body: json(input) }),
  update: (c: Connection, id: string, input: Partial<RecipeInput>) =>
    request<Recipe>(c, `/recipes/${id}`, { method: "PATCH", body: json(input) }),
};
