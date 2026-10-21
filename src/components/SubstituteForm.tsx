import { useState } from "react";
import { ApiError } from "../api";
import type { AdminSubstitute, SubstituteInput, Unit } from "../types";

interface Props {
  units: Unit[];
  initial?: AdminSubstitute;
  usedPriorities: number[];
  onSubmit: (input: SubstituteInput) => Promise<void>;
  onCancel?: () => void;
}

const toNumber = (value: string) => (value.trim() === "" ? null : Number(value));

export function SubstituteForm({ units, initial, usedPriorities, onSubmit, onCancel }: Props) {
  const defaultPriority = initial?.priority ?? ([1, 2].find((p) => !usedPriorities.includes(p)) ?? 1);
  const [name, setName] = useState(initial?.substituteName ?? "");
  const [priority, setPriority] = useState(defaultPriority);
  const [ratioLabel, setRatioLabel] = useState(initial?.ratioLabel ?? "");
  const [factor, setFactor] = useState(initial?.factor?.toString() ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [taste, setTaste] = useState(initial?.tasteDifference ?? "");
  const [cooking, setCooking] = useState(initial?.cookingChange ?? "");
  const [caution, setCaution] = useState(initial?.caution ?? "");
  const [uncertain, setUncertain] = useState(initial?.uncertain ?? false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const sameTarget = initial && name.trim() === initial.substituteName;
    try {
      await onSubmit({
        substituteIngredientId: sameTarget ? initial.substituteIngredientId : null,
        substituteName: sameTarget ? null : name,
        priority,
        ratioLabel: ratioLabel || null,
        factor: toNumber(factor),
        unit: unit || null,
        tasteDifference: taste,
        cookingChange: cooking || null,
        caution: caution || null,
        uncertain,
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
      <div className="grid-2">
        <label>
          대체 재료명 *
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 식용유" required />
          {fieldErrors.substituteName && <small className="error">{fieldErrors.substituteName}</small>}
        </label>
        <label>
          우선순위 *
          <select value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
            {[1, 2].map((p) => (
              <option key={p} value={p} disabled={p !== initial?.priority && usedPriorities.includes(p)}>
                {p}순위{p !== initial?.priority && usedPriorities.includes(p) ? " (사용 중)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          비율 표기
          <input value={ratioLabel} onChange={(e) => setRatioLabel(e.target.value)} placeholder="버터 1 : 식용유 0.8" />
        </label>
        <label>
          필요량 배수 (factor)
          <input
            type="number"
            step="0.001"
            min="0"
            max="10"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
            placeholder="비우면 '확인 필요'"
          />
          {fieldErrors.factor && <small className="error">{fieldErrors.factor}</small>}
        </label>
        <label>
          대체 후 단위
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="">원래 단위 유지</option>
            {units.map((u) => (
              <option key={u.code} value={u.code}>
                {u.label} ({u.code})
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={uncertain} onChange={(e) => setUncertain(e.target.checked)} />
          확인 필요 (불확실)
        </label>
      </div>
      <label>
        맛 차이 *
        <input value={taste} onChange={(e) => setTaste(e.target.value)} required />
        {fieldErrors.tasteDifference && <small className="error">{fieldErrors.tasteDifference}</small>}
      </label>
      <label>
        조리 변경 안내
        <input value={cooking} onChange={(e) => setCooking(e.target.value)} placeholder="예: 약불로 굽기" />
      </label>
      <label>
        주의사항
        <input value={caution} onChange={(e) => setCaution(e.target.value)} placeholder="알레르기·식감 등" />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            취소
          </button>
        )}
        <button type="submit" disabled={saving}>
          {saving ? "저장 중…" : initial ? "수정 저장" : "대체 재료 연결"}
        </button>
      </div>
    </form>
  );
}
