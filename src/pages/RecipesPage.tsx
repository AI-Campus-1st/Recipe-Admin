import { useCallback, useEffect, useState } from "react";
import { ApiError, recipeApi, type Connection } from "../api";
import { RecipeForm } from "../components/RecipeForm";
import { CATEGORY_LABELS, RECIPE_CATEGORIES, STATUS_LABELS, type Recipe, type RecipeCategory, type RecipeInput } from "../types";

export function RecipesPage({ connection }: { connection: Connection }) {
  const [category, setCategory] = useState<RecipeCategory | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [editing, setEditing] = useState<Recipe | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRecipes(await recipeApi.list(connection, category));
    } catch (err) {
      setError(err instanceof ApiError ? err.body.message : "레시피를 불러오지 못했습니다.");
    }
  }, [connection, category]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (input: RecipeInput) => {
    if (editing && editing !== "new") {
      // sourceUrl is fixed for collected recipes; only editable fields are sent
      const { sourceUrl: _ignored, ...fields } = input;
      void _ignored;
      await recipeApi.update(connection, editing.id, fields);
    } else {
      await recipeApi.create(connection, input);
    }
    setEditing(null);
    await load();
  };

  if (editing) {
    return (
      <section className="panel narrow">
        <RecipeForm initial={editing === "new" ? undefined : editing} onSubmit={save} onCancel={() => setEditing(null)} />
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="toolbar">
        <div className="tabs small">
          <button className={category === null ? "active" : ""} onClick={() => setCategory(null)}>
            전체
          </button>
          {RECIPE_CATEGORIES.map((c) => (
            <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <button onClick={() => setEditing("new")}>+ 새 레시피</button>
      </div>
      <p className="muted small">
        레시피는 사용자 소유 데이터입니다. 설정의 사용자 토큰이 비어 있으면 개발 사용자(AUTH_MODE=dev) 기준으로 조회·저장합니다.
      </p>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>레시피</th>
            <th>카테고리</th>
            <th>상태</th>
            <th className="num">인분</th>
            <th className="num">시간</th>
            <th className="num">재료</th>
            <th>출처</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {recipes.map((r) => (
            <tr key={r.id}>
              <td>{r.title ?? <span className="muted">(제목 없음)</span>}</td>
              <td>{r.category ? CATEGORY_LABELS[r.category] : <span className="muted">-</span>}</td>
              <td>
                <span className={`chip status-${r.status}`}>{STATUS_LABELS[r.status]}</span>
              </td>
              <td className="num">{r.baseServings ?? "-"}</td>
              <td className="num">{r.cookMinutes ?? "-"}</td>
              <td className="num">{r.ingredients.length}</td>
              <td className="truncate">{r.sourceUrl ?? <span className="muted">사용자 정의</span>}</td>
              <td>
                <button className="secondary" disabled={r.status === "importing"} onClick={() => setEditing(r)}>
                  수정
                </button>
              </td>
            </tr>
          ))}
          {recipes.length === 0 && (
            <tr>
              <td colSpan={8} className="muted">
                레시피가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
