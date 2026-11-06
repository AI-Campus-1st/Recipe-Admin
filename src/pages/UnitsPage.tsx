import { useCallback, useEffect, useState } from "react";
import { ApiError, adminApi, type Connection } from "../api";
import { DIMENSION_LABELS, FACTORLESS_DIMENSIONS, UNIT_DIMENSIONS, type Unit, type UnitDimension } from "../types";

const FACTOR_CHANGE_WARNING =
  "기준 환산값을 바꾸면 이 단위를 쓰는 저장된 레시피의 장보기 합산이 바뀝니다.\n(사용 중 여부는 API가 알려주지 않아 환산값을 바꿀 때마다 확인합니다.)\n저장할까요?";

const parseAliases = (value: string) =>
  value
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

export function UnitsPage({ connection }: { connection: Connection }) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [editing, setEditing] = useState<Unit | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!connection.adminKey) return;
    setLoading(true);
    setError(null);
    try {
      setUnits(await adminApi.units(connection));
    } catch (err) {
      setError(err instanceof ApiError ? err.body.message : "단위 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    load();
  }, [load]);

  const saved = async (unit: Unit) => {
    await load();
    setEditing(unit);
  };

  const remove = async (unit: Unit) => {
    if (!confirm(`'${unit.label}' (${unit.code}) 단위를 삭제할까요?`)) return;
    try {
      await adminApi.deleteUnit(connection, unit.code);
      setEditing(null);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.body.message : "삭제하지 못했습니다.");
    }
  };

  return (
    <div className="split">
      <section className="panel">
        <div className="toolbar">
          <span className="muted">단위 {units.length}개 (차원 → 코드 순)</span>
          <button onClick={() => setEditing("new")}>+ 단위 추가</button>
        </div>
        {error && <p className="error">{error}</p>}
        <table>
          <thead>
            <tr>
              <th>코드</th>
              <th>표시명</th>
              <th>차원</th>
              <th className="num">기준 환산값</th>
              <th>별칭</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr
                key={unit.code}
                className={editing !== "new" && editing?.code === unit.code ? "selected" : undefined}
                onClick={() => setEditing(unit)}
              >
                <td>
                  <code>{unit.code}</code>
                </td>
                <td>{unit.label}</td>
                <td>{DIMENSION_LABELS[unit.dimension] ?? unit.dimension}</td>
                <td className="num">{unit.toBaseFactor ?? <span className="muted">-</span>}</td>
                <td>
                  {unit.aliases.length === 0 ? (
                    <span className="muted">없음</span>
                  ) : (
                    unit.aliases.map((a) => (
                      <span key={a} className="chip">
                        {a}
                      </span>
                    ))
                  )}
                </td>
              </tr>
            ))}
            {!loading && units.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  단위가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="panel">
        {editing === null ? (
          <p className="muted">왼쪽에서 단위를 선택하면 수정·삭제할 수 있습니다. 새 단위는 "+ 단위 추가"로 만듭니다.</p>
        ) : (
          <UnitForm
            key={editing === "new" ? "new" : editing.code}
            connection={connection}
            initial={editing === "new" ? undefined : editing}
            onSaved={saved}
            onDelete={editing === "new" ? undefined : () => remove(editing)}
            onCancel={() => setEditing(null)}
          />
        )}
      </section>
    </div>
  );
}

interface FormProps {
  connection: Connection;
  initial?: Unit;
  onSaved: (unit: Unit) => Promise<void>;
  onDelete?: () => void;
  onCancel: () => void;
}

function UnitForm({ connection, initial, onSaved, onDelete, onCancel }: FormProps) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [dimension, setDimension] = useState<UnitDimension>(initial?.dimension ?? "mass");
  const [factor, setFactor] = useState(initial?.toBaseFactor?.toString() ?? "");
  const [aliases, setAliases] = useState(initial?.aliases.join(", ") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const factorless = FACTORLESS_DIMENSIONS.includes(dimension);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const toBaseFactor = factorless || factor.trim() === "" ? null : Number(factor);
    if (initial && toBaseFactor !== initial.toBaseFactor && !confirm(FACTOR_CHANGE_WARNING)) return;

    setSaving(true);
    setError(null);
    setFieldErrors({});
    const body = { label, dimension, toBaseFactor, aliases: parseAliases(aliases) };
    try {
      const unit = initial
        ? await adminApi.updateUnit(connection, initial.code, body)
        : await adminApi.createUnit(connection, { code: code.trim(), ...body });
      await onSaved(unit);
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

  const fieldError = (name: string) => fieldErrors[name] && <span className="error small">{fieldErrors[name]}</span>;

  return (
    <form className="form" onSubmit={submit}>
      <h2>{initial ? `단위 수정 · ${initial.label}` : "단위 추가"}</h2>
      <div className="grid-2">
        <label>
          코드 {initial && <span className="muted small">(수정 불가)</span>}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            readOnly={!!initial}
            disabled={!!initial}
            placeholder="영문·숫자·_ (예: bottle)"
            maxLength={30}
            required
          />
          {fieldError("code")}
        </label>
        <label>
          표시명
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: 병" maxLength={50} required />
          {fieldError("label")}
        </label>
        <label>
          차원
          <select value={dimension} onChange={(e) => setDimension(e.target.value as UnitDimension)}>
            {UNIT_DIMENSIONS.map((d) => (
              <option key={d} value={d}>
                {DIMENSION_LABELS[d]}
              </option>
            ))}
          </select>
          {fieldError("dimension")}
        </label>
        <label>
          기준 환산값 {!factorless && <span className="muted small">({dimension === "mass" ? "g" : "ml"} 기준)</span>}
          <input
            type="number"
            step="0.0001"
            min="0"
            value={factorless ? "" : factor}
            onChange={(e) => setFactor(e.target.value)}
            disabled={factorless}
            placeholder={factorless ? "개수·계량 없음은 환산값 없음" : "예: 15"}
            required={!factorless}
          />
          {fieldError("toBaseFactor")}
        </label>
      </div>
      <label>
        별칭 <span className="muted small">(쉼표로 구분, 원문 수량 해석에 사용)</span>
        <input value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="예: 병, bottle" />
        {fieldError("aliases")}
      </label>
      {error && !Object.values(fieldErrors).includes(error) && <p className="error">{error}</p>}
      <div className="actions">
        {onDelete && (
          <button type="button" className="danger" onClick={onDelete} disabled={saving}>
            삭제
          </button>
        )}
        <button type="button" className="secondary" onClick={onCancel} disabled={saving}>
          취소
        </button>
        <button type="submit" disabled={saving}>
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}
