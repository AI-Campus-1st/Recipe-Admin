import { useState } from "react";
import { adminApi, ApiError, loadConnection, saveConnection, type Connection } from "./api";
import { IngredientsPage } from "./pages/IngredientsPage";
import { RecipesPage } from "./pages/RecipesPage";
import { UnitsPage } from "./pages/UnitsPage";

type Tab = "ingredients" | "recipes" | "units";

export function App() {
  const [connection, setConnection] = useState<Connection>(loadConnection);
  const [draft, setDraft] = useState<Connection>(connection);
  const [showSettings, setShowSettings] = useState(!connection.adminKey);
  const [tab, setTab] = useState<Tab>("ingredients");
  const [status, setStatus] = useState<string | null>(null);

  const apply = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("연결 확인 중…");
    try {
      await adminApi.units(draft);
      saveConnection(draft);
      setConnection(draft);
      setStatus("연결되었습니다.");
      setShowSettings(false);
    } catch (err) {
      setStatus(err instanceof ApiError ? err.body.message : "연결할 수 없습니다.");
    }
  };

  return (
    <div className="app">
      <header>
        <h1>레시피 관리자</h1>
        <nav className="tabs">
          <button className={tab === "ingredients" ? "active" : ""} onClick={() => setTab("ingredients")}>
            재료 · 대체 재료
          </button>
          <button className={tab === "recipes" ? "active" : ""} onClick={() => setTab("recipes")}>
            레시피
          </button>
          <button className={tab === "units" ? "active" : ""} onClick={() => setTab("units")}>
            단위
          </button>
        </nav>
        <button className="secondary" onClick={() => setShowSettings((v) => !v)}>
          연결 설정
        </button>
      </header>

      {showSettings && (
        <form className="panel settings" onSubmit={apply}>
          <label>
            API 주소
            <input value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} />
          </label>
          <label>
            관리자 키 (X-Admin-Key, backend/.env의 ADMIN_API_KEY)
            <input
              type="password"
              value={draft.adminKey}
              onChange={(e) => setDraft({ ...draft, adminKey: e.target.value })}
              autoComplete="off"
            />
          </label>
          <label>
            사용자 토큰 (선택, 레시피 API용 Supabase access token)
            <input
              type="password"
              value={draft.userToken}
              onChange={(e) => setDraft({ ...draft, userToken: e.target.value })}
              autoComplete="off"
              placeholder="비우면 개발 사용자"
            />
          </label>
          <div className="actions">
            {status && <span className="muted">{status}</span>}
            <button type="submit">저장 및 연결 확인</button>
          </div>
        </form>
      )}

      <main>
        {tab === "ingredients" && <IngredientsPage connection={connection} />}
        {tab === "recipes" && <RecipesPage connection={connection} />}
        {tab === "units" && <UnitsPage connection={connection} />}
      </main>
    </div>
  );
}
