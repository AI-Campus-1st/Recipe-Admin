import { useCallback, useEffect, useState } from "react";
import { ApiError, adminApi, type Connection } from "../api";
import { SubstituteForm } from "../components/SubstituteForm";
import type { AdminIngredient, AdminSubstitute, SubstituteInput, Unit } from "../types";

const PAGE_SIZE = 20;

export function IngredientsPage({ connection }: { connection: Connection }) {
  const [query, setQuery] = useState("");
  const [onlyWithSubs, setOnlyWithSubs] = useState(false);
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<AdminIngredient[]>([]);
  const [total, setTotal] = useState(0);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selected, setSelected] = useState<AdminIngredient | null>(null);
  const [editing, setEditing] = useState<AdminSubstitute | "new" | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!connection.adminKey) return;
    setLoading(true);
    setError(null);
    try {
      const page = await adminApi.ingredients(connection, { query, offset, limit: PAGE_SIZE, withSubstitutes: onlyWithSubs });
      setItems(page.items);
      setTotal(page.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.body.message : "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [connection, query, offset, onlyWithSubs]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (connection.adminKey) adminApi.units(connection).then(setUnits, () => setUnits([]));
  }, [connection]);

  const refreshSelected = (updated: AdminIngredient) => {
    setSelected(updated);
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const save = async (input: SubstituteInput) => {
    if (!selected) return;
    const updated =
      editing && editing !== "new"
        ? await adminApi.updateSubstitute(connection, editing.id, input)
        : await adminApi.createSubstitute(connection, selected.id, input);
    refreshSelected(updated);
    setEditing(null);
  };

  const remove = async (sub: AdminSubstitute) => {
    if (!selected || !confirm(`'${sub.substituteName}' 대체 재료 연결을 삭제할까요?`)) return;
    try {
      await adminApi.deleteSubstitute(connection, sub.id);
      refreshSelected(await adminApi.ingredient(connection, selected.id));
    } catch (err) {
      alert(err instanceof ApiError ? err.body.message : "삭제하지 못했습니다.");
    }
  };

  const createIngredient = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) return;
    try {
      const created = await adminApi.createIngredient(connection, newName);
      setNewName("");
      setSelected(created);
      setQuery(created.name);
      setOffset(0);
    } catch (err) {
      alert(err instanceof ApiError ? err.body.message : "재료를 추가하지 못했습니다.");
    }
  };

  return (
    <div className="split">
      <section className="panel">
        <div className="toolbar">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOffset(0);
            }}
            placeholder="재료명 검색"
          />
          <label className="checkbox">
            <input
              type="checkbox"
              checked={onlyWithSubs}
              onChange={(e) => {
                setOnlyWithSubs(e.target.checked);
                setOffset(0);
              }}
            />
            대체 재료 있는 것만
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <table>
          <thead>
            <tr>
              <th>재료</th>
              <th className="num">사용 레시피</th>
              <th>대체 재료</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className={selected?.id === item.id ? "selected" : undefined}
                onClick={() => {
                  setSelected(item);
                  setEditing(null);
                }}
              >
                <td>{item.name}</td>
                <td className="num">{item.recipeCount}</td>
                <td>
                  {item.substitutes.length === 0 ? (
                    <span className="muted">없음</span>
                  ) : (
                    item.substitutes.map((s) => (
                      <span key={s.id} className={`chip${s.uncertain ? " warn" : ""}`}>
                        {s.priority}. {s.substituteName}
                      </span>
                    ))
                  )}
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  재료가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="pager">
          <button className="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
            이전
          </button>
          <span>
            {total === 0 ? 0 : offset + 1}–{Math.min(offset + PAGE_SIZE, total)} / {total}
          </span>
          <button className="secondary" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
            다음
          </button>
        </div>
        <form className="inline-form" onSubmit={createIngredient}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="새 재료명 (예: 무염 버터)" />
          <button type="submit">재료 추가</button>
        </form>
      </section>

      <section className="panel">
        {!selected ? (
          <p className="muted">왼쪽에서 재료를 선택하면 대체 재료를 연결·수정할 수 있습니다.</p>
        ) : (
          <>
            <h2>{selected.name}</h2>
            <p className="muted">
              사용 레시피 {selected.recipeCount}개 · 매칭 키 <code>{selected.normalizedName}</code>
            </p>
            <h3>대체 재료 (최대 2개)</h3>
            {selected.substitutes.length === 0 && <p className="muted">연결된 대체 재료가 없습니다.</p>}
            {selected.substitutes.map((sub) =>
              editing !== "new" && editing?.id === sub.id ? (
                <SubstituteForm
                  key={sub.id}
                  units={units}
                  initial={sub}
                  usedPriorities={selected.substitutes.map((s) => s.priority)}
                  onSubmit={save}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div key={sub.id} className="card">
                  <div className="card-head">
                    <strong>
                      {sub.priority}순위 · {sub.substituteName}
                    </strong>
                    {sub.uncertain && <span className="chip warn">확인 필요</span>}
                    {sub.inUse && <span className="chip">식단 적용 중</span>}
                  </div>
                  <dl>
                    <dt>비율</dt>
                    <dd>{sub.ratioLabel ?? "-"}</dd>
                    <dt>배수 / 단위</dt>
                    <dd>
                      {sub.factor ?? "미확인"} / {sub.unitLabel ?? "원래 단위"}
                    </dd>
                    <dt>맛 차이</dt>
                    <dd>{sub.tasteDifference}</dd>
                    <dt>조리 변경</dt>
                    <dd>{sub.cookingChange ?? "-"}</dd>
                    <dt>주의사항</dt>
                    <dd>{sub.caution ?? "-"}</dd>
                    <dt>출처</dt>
                    <dd className="muted">{sub.sourceVersion}</dd>
                  </dl>
                  <div className="actions">
                    <button className="secondary" onClick={() => setEditing(sub)}>
                      수정
                    </button>
                    <button className="danger" disabled={sub.inUse} title={sub.inUse ? "식단에 적용된 대체 재료" : undefined} onClick={() => remove(sub)}>
                      삭제
                    </button>
                  </div>
                </div>
              ),
            )}
            {editing === "new" ? (
              <SubstituteForm
                units={units}
                usedPriorities={selected.substitutes.map((s) => s.priority)}
                onSubmit={save}
                onCancel={() => setEditing(null)}
              />
            ) : (
              selected.substitutes.length < 2 && (
                <button onClick={() => setEditing("new")}>+ 대체 재료 연결</button>
              )
            )}
          </>
        )}
      </section>
    </div>
  );
}
