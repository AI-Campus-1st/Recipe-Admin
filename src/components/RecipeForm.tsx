import { useState } from "react";
import { ApiError } from "../api";
import { CATEGORY_LABELS, RECIPE_CATEGORIES, type Recipe, type RecipeCategory, type RecipeInput } from "../types";

interface Row {
  key: string;
  id: string | null;
  name: string;
  amount: string;
}

interface Props {
  initial?: Recipe;
  onSubmit: (input: RecipeInput) => Promise<void>;
  onCancel: () => void;
}

let rowSeq = 0;
const newRow = (id: string | null = null, name = "", amount = ""): Row => ({ key: `r${rowSeq++}`, id, name, amount });

function amountText(quantity: number | null, unit: string | null, raw?: string | null): string {
  if (raw) return raw;
  if (quantity === null) return unit ?? "";
  return `${quantity}${unit ?? ""}`;
}

export function RecipeForm({ initial, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<RecipeCategory | "">(initial?.category ?? "");
  const [baseServings, setBaseServings] = useState(initial?.baseServings?.toString() ?? "");
  const [cookMinutes, setCookMinutes] = useState(initial?.cookMinutes?.toString() ?? "");
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [rows, setRows] = useState<Row[]>(
    initial?.ingredients.length
      ? initial.ingredients.map((i) => newRow(i.id, i.name, amountText(i.quantity, i.unit, i.rawAmount)))
      : [newRow()],
  );
  const [steps, setSteps] = useState((initial?.steps ?? []).join("\n"));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const moveRow = (index: number, delta: number) =>
    setRows((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      await onSubmit({
        title,
        category: category || null,
        baseServings: baseServings ? Number(baseServings) : null,
        cookMinutes: cookMinutes ? Number(cookMinutes) : null,
        ingredients: rows
          .filter((r) => r.name.trim())
          .map((r) => ({ id: r.id, name: r.name, amount: r.amount.trim() || null })),
        steps: steps.split("\n").map((s) => s.trim()).filter(Boolean),
        sourceUrl: sourceUrl.trim() || null,
        imageUrl: imageUrl.trim() || null,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.body.message);
        setFieldErrors(err.body.fieldErrors ?? {});
      } else {
        setError("저장하지 못했습니다.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      <h2>{initial ? "레시피 수정" : "새 레시피 (사용자 정의)"}</h2>
      <div className="grid-2">
        <label>
          레시피명 *
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          {fieldErrors.title && <small className="error">{fieldErrors.title}</small>}
        </label>
        <label>
          카테고리
          <select value={category} onChange={(e) => setCategory(e.target.value as RecipeCategory | "")}>
            <option value="">미분류</option>
            {RECIPE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]} ({c})
              </option>
            ))}
          </select>
        </label>
        <label>
          기준 인분
          <input type="number" min={1} max={100} value={baseServings} onChange={(e) => setBaseServings(e.target.value)} />
        </label>
        <label>
          조리 시간(분)
          <input type="number" min={0} max={1440} value={cookMinutes} onChange={(e) => setCookMinutes(e.target.value)} />
        </label>
        {!initial && (
          <label>
            참고 URL
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://" />
            {fieldErrors.sourceUrl && <small className="error">{fieldErrors.sourceUrl}</small>}
          </label>
        )}
        <label>
          대표 이미지 URL
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://" />
          {fieldErrors.imageUrl && <small className="error">{fieldErrors.imageUrl}</small>}
        </label>
      </div>

      <h3>재료 *</h3>
      <p className="muted small">수량은 원문 표기로 입력합니다 (예: 2큰술, 1/2컵, 약간). 단위는 서버가 환산 규칙으로 해석합니다.</p>
      {fieldErrors.ingredients && <small className="error">{fieldErrors.ingredients}</small>}
      <div className="rows">
        {rows.map((row, index) => (
          <div key={row.key} className="row">
            <input value={row.name} onChange={(e) => updateRow(row.key, { name: e.target.value })} placeholder="재료명" />
            <input value={row.amount} onChange={(e) => updateRow(row.key, { amount: e.target.value })} placeholder="수량" />
            <button type="button" className="icon" onClick={() => moveRow(index, -1)} aria-label="위로">
              ↑
            </button>
            <button type="button" className="icon" onClick={() => moveRow(index, 1)} aria-label="아래로">
              ↓
            </button>
            <button
              type="button"
              className="icon danger"
              onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== row.key) : [newRow()]))}
              aria-label="삭제"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="secondary" onClick={() => setRows((prev) => [...prev, newRow()])}>
        + 재료 추가
      </button>

      <label>
        조리 순서 (한 줄에 한 단계)
        <textarea rows={6} value={steps} onChange={(e) => setSteps(e.target.value)} />
      </label>

      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="button" className="secondary" onClick={onCancel}>
          취소
        </button>
        <button type="submit" disabled={saving}>
          {saving ? "저장 중…" : initial ? "수정 저장" : "레시피 저장"}
        </button>
      </div>
    </form>
  );
}
