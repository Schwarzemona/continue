---
name: react-best-practices
description: ReactやNext.jsのファイルを編集するときに読むスキル。
---

# React ベストプラクティス

以下は、React および Next.js アプリケーションのための包括的なパフォーマンス最適化ガイドです。影響度に基づいて、致命的なものから漸進的なものへと優先順位付けされています。各ルールには、詳細な説明、誤った実装と正しい実装を比較した実例、および自動リファクタリングやコード生成をガイドするための具体的な影響指標が含まれています。

> **注意:** プロジェクトで [React Compiler](https://react.dev/learn/react-compiler) が有効になっている場合、手動のメモ化 (`memo()`, `useMemo()`, `useCallback()`) および静的な JSX ホイスティングは自動的に処理されます。

## 1. ウォーターフォール（連鎖的な待機）の排除

ウォーターフォールは、パフォーマンスを低下させる最大の要因です。逐次的な `await` は、ネットワークのレイテンシを累積させます。

### 1.1 必要な時まで await を遅延させる (致命的な影響)

データが実際に使用されるブランチ内に `await` を移動してください。

```typescript
// ❌ 悪い例: 両方のブランチをブロックする
async function handleRequest(userId: string, skip: boolean) {
  const userData = await fetchUserData(userId);
  if (skip) return { skipped: true };
  return processUserData(userData);
}

// ✅ 良い例: 必要な時だけフェッチする
async function handleRequest(userId: string, skip: boolean) {
  if (skip) return { skipped: true };
  const userData = await fetchUserData(userId);
  return processUserData(userData);
}
```

### 1.2 依存関係に基づいた並列化 (致命的な影響)

操作に部分的な依存関係がある場合は、`better-all` を使用して並列性を最大化してください。

```typescript
// ❌ 悪い例: profile が不必要に config を待ってしまう
const [user, config] = await Promise.all([fetchUser(), fetchConfig()]);
const profile = await fetchProfile(user.id);

// ✅ 良い例: config と profile は並列で実行される
import { all } from "better-all";
const { user, config, profile } = await all({
  async user() {
    return fetchUser();
  },
  async config() {
    return fetchConfig();
  },
  async profile() {
    return fetchProfile((await this.$.user).id);
  },
});
```

### 1.3 独立した操作の並列化 (致命的な影響)

`Promise.all()` を使用するか、プロミスを早期に作成して、独立した操作を即座に開始してください。

```typescript
// ❌ 悪い例: 逐次実行により、3回のラウンドトリップが発生する
const user = await fetchUser();
const posts = await fetchPosts();
const comments = await fetchComments();

// ✅ 良い例: 並列実行により、1回のラウンドトリップで済む
const [user, posts, comments] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchComments(),
]);

// ✅ 良い例: API ルートではプロミスを早期に開始する
export async function GET(request: Request) {
  const sessionPromise = auth();
  const configPromise = fetchConfig();
  const session = await sessionPromise;
  const [config, data] = await Promise.all([
    configPromise,
    fetchData(session.user.id),
  ]);
  return Response.json({ data, config });
}
```

### 1.4 戦略的な Suspense 境界 (致命的な影響)

Suspense を使用して、データの読み込み中にラッパー UI を即座に表示してください。

```tsx
// ❌ 悪い例: データ取得によってページ全体がブロックされる
async function Page() {
  const data = await fetchData();
  return (
    <div>
      <Sidebar />
      <Header />
      <DataDisplay data={data} />
      <Footer />
    </div>
  );
}

// ✅ 良い例: レイアウトが即座にレンダリングされ、データがストリームで流れてくる
function Page() {
  return (
    <div>
      <Sidebar />
      <Header />
      <Suspense fallback={<Skeleton />}>
        <DataDisplay />
      </Suspense>
      <Footer />
    </div>
  );
}

async function DataDisplay() {
  const data = await fetchData();
  return <div>{data.content}</div>;
}
```

}

````

## 2. バンドルサイズの最適化

### 2.1 バレルファイルのインポートを避ける (致命的な影響)

未使用のモジュールを大量に読み込まないように、ソースファイルから直接インポートしてください。バレルファイルは、インポートするだけで 200-800ms かかる場合があります。

```tsx
// ❌ 悪い例: ライブラリ全体をインポートする
import { Check, X, Menu } from "lucide-react";

// ✅ 良い例: 必要なものだけをインポートする
import Check from "lucide-react/dist/esm/icons/check";
import X from "lucide-react/dist/esm/icons/x";

// ✅ 代替案: Next.js 13.5+ optimizePackageImports
// next.config.js
module.exports = {
  experimental: { optimizePackageImports: ["lucide-react", "@mui/material"] },
};
````

### 2.2 条件付きモジュールの読み込み (高い影響)

機能が有効になったときにのみ、大きなモジュールを読み込んでください。

```tsx
function AnimationPlayer({ enabled }: { enabled: boolean }) {
  const [frames, setFrames] = useState<Frame[] | null>(null);

  useEffect(() => {
    if (enabled && !frames && typeof window !== "undefined") {
      import("./animation-frames.js").then((mod) => setFrames(mod.frames));
    }
  }, [enabled, frames]);

  if (!frames) return <Skeleton />;
  return <Canvas frames={frames} />;
}
```

### 2.3 非クリティカルなライブラリの遅延読み込み (中程度の影響)

ハイドレーション後にアナリティクスやロギングを読み込んでください。

```tsx
// ❌ Bad: blocks initial bundle
import { Analytics } from "@vercel/analytics/react";

// ✅ Good: loads after hydration
import dynamic from "next/dynamic";
const Analytics = dynamic(
  () => import("@vercel/analytics/react").then((m) => m.Analytics),
  { ssr: false },
);
```

### 2.4 重いコンポーネントの動的インポート (致命的な影響)

```tsx
// ❌ 悪い例: Monaco がメインチャンクに含まれる (~300KB)
import { MonacoEditor } from "./monaco-editor";

// ✅ 良い例: Monaco をオンデマンドで読み込む
import dynamic from "next/dynamic";
const MonacoEditor = dynamic(
  () => import("./monaco-editor").then((m) => m.MonacoEditor),
  { ssr: false },
);
```

### 2.5 ユーザーの意図に応じたプリロード (中程度の影響)

体感的なレイテンシを減らすために、ホバー時やフォーカス時に重いバンドルをプリロードしてください。

```tsx
function EditorButton({ onClick }: { onClick: () => void }) {
  const preload = () => {
    void import("./monaco-editor");
  };
  return (
    <button onMouseEnter={preload} onFocus={preload} onClick={onClick}>
      Open Editor
    </button>
  );
}
```

## 3. サーバーサイドのパフォーマンス

### 3.1 リクエストをまたぐ LRU キャッシング (高い影響)

`React.cache()` は単一のリクエスト内でのみ機能します。リクエストをまたいでキャッシュするには LRU を使用してください。

```typescript
import { LRUCache } from "lru-cache";

const cache = new LRUCache<string, any>({ max: 1000, ttl: 5 * 60 * 1000 });

export async function getUser(id: string) {
  const cached = cache.get(id);
  if (cached) return cached;
  const user = await db.user.findUnique({ where: { id } });
  cache.set(id, user);
  return user;
}
```

### 3.2 RSC 境界でのシリアライズの最小化 (高い影響)

サーバーとクライアントの境界を越えて渡すフィールドは、クライアントが実際に使用するものだけに限定してください。

```tsx
// ❌ 悪い例: 50個すべてのフィールドをシリアライズする
async function Page() {
  const user = await fetchUser();
  return <Profile user={user} />;
}

// ✅ 良い例: 必要なフィールドのみをシリアライズする
async function Page() {
  const user = await fetchUser();
  return <Profile name={user.name} />;
}
```

### 3.3 コンポーネント構成によるデータ取得の並列化 (致命的な影響)

データ取得を並列化するためにコンポーネントを再構成してください。

```tsx
// ❌ 悪い例: Sidebar が Page のフェッチを待ってしまう
export default async function Page() {
  const header = await fetchHeader();
  return (
    <div>
      <div>{header}</div>
      <Sidebar />
    </div>
  );
}

// ✅ 良い例: 両方が同時にフェッチされる
async function Header() {
  const data = await fetchHeader();
  return <div>{data}</div>;
}

export default function Page() {
  return (
    <div>
      <Header />
      <Sidebar />
    </div>
  );
}
```

### 3.4 React.cache() によるリクエストごとの重複排除 (中程度の影響)

認証やデータベースクエリに使用してください。注意: Next.js は `fetch` 呼び出しを自動的に重複排除します。

```typescript
import { cache } from "react";

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return await db.user.findUnique({ where: { id: session.user.id } });
});
```

### 3.5 非ブロッキング操作のための after() の使用 (中程度の影響)

レスポンス送信後にロギングやアナリティクスをスケジュールしてください。

```tsx
import { after } from "next/server";

export async function POST(request: Request) {
  await updateDatabase(request);
  after(async () => {
    logUserAction({ userAgent: request.headers.get("user-agent") });
  });
  return Response.json({ status: "success" });
}
```

## 4. クライアントサイドのデータ取得

### 4.1 パッシブ・イベント・リスナーの使用 (中程度の影響)

タッチ/ホイール・リスナーに `{ passive: true }` を追加して、即座のスクロールを可能にしてください。

```typescript
// ✅ 良い例: ブラウザが即座にスクロールできる
document.addEventListener("touchstart", handler, { passive: true });
document.addEventListener("wheel", handler, { passive: true });
```

### 4.2 自動重複排除のための SWR の使用 (中程度の影響)

```tsx
// ❌ 悪い例: 各インスタンスが個別にフェッチする
const [users, setUsers] = useState([]);
useEffect(() => {
  fetch("/api/users")
    .then((r) => r.json())
    .then(setUsers);
}, []);

// ✅ 良い例: 複数のインスタンスが 1 つのリクエストを共有する
import useSWR from "swr";
const { data: users } = useSWR("/api/users", fetcher);
```

### 4.3 localStorage データのバージョニング (中程度の影響)

バージョン接頭辞を追加し、最小限のフィールドのみを保存してください。常に try-catch で囲んでください（シークレットモードでは例外が発生するため）。

```typescript
const VERSION = "v2";

function saveConfig(config: { theme: string }) {
  try {
    localStorage.setItem(`config:${VERSION}`, JSON.stringify(config));
  } catch {}
}
```

## 5. 再レンダリングの最適化

### 5.1 ステートの読み込みを使用箇所まで遅延させる (中程度の影響)

コールバック内でのみ読み取る場合は、動的なステートを購読しないでください。

```tsx
// ❌ 悪い例: すべての searchParams の変更を購読する
const searchParams = useSearchParams();
const handleShare = () => {
  shareChat(searchParams.get("ref"));
};

// ✅ 良い例: オンデマンドで読み取る
const handleShare = () => {
  const ref = new URLSearchParams(window.location.search).get("ref");
  shareChat(ref);
};
```

### 5.2 メモ化されたコンポーネントへの抽出 (中程度の影響)

高コストな計算の前に、早期リターンを可能にします。

```tsx
// ✅ 良い例: ロード中は計算をスキップする
const UserAvatar = memo(function UserAvatar({ user }: { user: User }) {
  const id = useMemo(() => computeAvatarId(user), [user]);
  return <Avatar id={id} />;
});

function Profile({ user, loading }: Props) {
  if (loading) return <Skeleton />;
  return <UserAvatar user={user} />;
}
```

### 5.3 Effect の依存関係を絞り込む (低い影響)

オブジェクトの代わりにプリミティブを使用してください。また、連続的な値からブール値を導出してください。

```tsx
// ❌ 悪い例: user の変更があればいつでも再実行される
useEffect(() => {
  console.log(user.id);
}, [user]);

// ✅ 良い例: id が変更されたときのみ再実行される
useEffect(() => {
  console.log(user.id);
}, [user.id]);

// ✅ 良い例: 連続的な値からブール値を導出する
const isMobile = width < 768;
useEffect(() => {
  if (isMobile) enableMobileMode();
}, [isMobile]);
```

### 5.4 派生ステートの購読 (中程度の影響)

```tsx
// ❌ 悪い例: ピクセルごとに再レンダリングされる
const width = useWindowWidth();
const isMobile = width < 768;

// ✅ 良い例: ブール値の変更時のみ再レンダリングされる
const isMobile = useMediaQuery("(max-width: 767px)");
```

### 5.5 関数型の setState と遅延初期化の使用 (中程度の影響)

関数型の更新は、古いクロージャ（stale closures）を防ぎ、安定したコールバックを作成します。遅延初期化は、レンダリングごとの計算を回避します。

```tsx
// ❌ 悪い例: 古いクロージャのリスクがあり、コールバックが再作成される
const addItem = useCallback(
  (item: Item) => {
    setItems([...items, item]);
  },
  [items],
);

// ✅ 良い例: 安定したコールバックで、常に最新のステートを使用する
const addItem = useCallback((item: Item) => {
  setItems((curr) => [...curr, item]);
}, []);

// ❌ 悪い例: buildIndex がレンダリングのたびに実行される
const [index] = useState(buildSearchIndex(items));

// ✅ 良い例: buildIndex は一度だけ実行される
const [index] = useState(() => buildSearchIndex(items));
```

### 5.6 緊急性の低い更新に Transitions を使用する (中程度の影響)

```tsx
import { startTransition } from "react";

useEffect(() => {
  const handler = () => {
    startTransition(() => setScrollY(window.scrollY));
  };
  window.addEventListener("scroll", handler, { passive: true });
  return () => window.removeEventListener("scroll", handler);
}, []);
```

## 6. レンダリングのパフォーマンス

### 6.1 長いリストに対する CSS content-visibility (中程度の影響)

画面外のレンダリングを遅延させることで、長いリストの初期レンダリングを 10 倍高速化します。

```css
.message-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px;
}
```

### 6.2 静的な JSX 要素のホイスティング (高い影響)

静的な JSX をコンポーネントの外に抽出してください。特に大きな SVG などが対象です。

```tsx
// ✅ 良い例: 同じ要素を再利用する
const skeleton = <div className="h-20 animate-pulse bg-gray-200" />;

function Container({ loading }: { loading: boolean }) {
  return <div>{loading && skeleton}</div>;
}
```

### 6.3 フリッカーのないハイドレーションミスマッチの防止 (低い影響)

React がハイドレートされる前に、クライアント専用の値を設定するための同期スクリプトを注入してください。

```tsx
function ThemeWrapper({ children }: { children: ReactNode }) {
  return (
    <>
      <div id="theme-wrapper">{children}</div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
        (function() {
          var theme = localStorage.getItem('theme') || 'light';
          document.getElementById('theme-wrapper').className = theme;
        })();
      `,
        }}
      />
    </>
  );
}
```

### 6.4 明示的な条件付きレンダリングの使用 (中程度の影響)

`0` や `NaN` がレンダリングされるのを防ぐために、三項演算子を使用してください。

```tsx
// ❌ 悪い例: count が 0 のときに "0" がレンダリングされる
{
  count && <Badge>{count}</Badge>;
}

// ✅ 良い例: count が 0 のときは何もレンダリングしない
{
  count > 0 ? <Badge>{count}</Badge> : null;
}
```

## 7. JavaScript のパフォーマンス

### 7.1 DOM CSS 変更のバッチ処理 (中程度の影響)

リフローを最小限に抑えるために、クラスまたは `cssText` を使用して CSS の変更をグループ化してください。

```typescript
// ❌ 悪い例: 複数のリフローが発生する
element.style.width = "100px";
element.style.height = "200px";

// ✅ 良い例: 単一のリフローで済む
element.classList.add("highlighted-box");
```

### 7.2 O(1) 検索のための Set/Map の使用 (低い影響)

繰り返しのメンバーシップチェックを行う場合は、配列を Set/Map に変換してください。

```typescript
// ❌ 悪い例: チェックごとに O(n)
items.filter((item) => allowedIds.includes(item.id));

// ✅ 良い例: チェックごとに O(1)
const allowedSet = new Set(allowedIds);
items.filter((item) => allowedSet.has(item.id));
```

### 7.3 繰り返しの検索のためのインデックスマップの構築 (低い影響)

```typescript
// ❌ 悪い例: 検索ごとに O(n)
orders.map((o) => ({ ...o, user: users.find((u) => u.id === o.userId) }));

// ✅ 良い例: 検索ごとに O(1)
const userById = new Map(users.map((u) => [u.id, u]));
orders.map((o) => ({ ...o, user: userById.get(o.userId) }));
```

### 7.4 高コストな操作のキャッシュ (中程度の影響)

関数の結果やストレージ API の呼び出しをキャッシュしてください。

```typescript
const cache = new Map<string, string>();

function cachedSlugify(text: string): string {
  if (!cache.has(text)) cache.set(text, slugify(text));
  return cache.get(text)!;
}

// localStorage の読み取りもキャッシュする
function getLocalStorage(key: string) {
  if (!cache.has(key)) cache.set(key, localStorage.getItem(key));
  return cache.get(key);
}
```

### 7.5 早期リターンと長さのチェック (中程度の影響)

結果が確定した時点で早期にリターンしてください。高コストな比較を行う前に長さをチェックしてください。

```typescript
// ✅ 良い例: 早期リターン
function validateUsers(users: User[]) {
  for (const user of users) {
    if (!user.email) return { valid: false, error: "Email required" };
  }
  return { valid: true };
}

// ✅ 良い例: ソートの前に長さをチェックする
function hasChanges(current: string[], original: string[]) {
  if (current.length !== original.length) return true;
  // ... 高コストな比較
}
```

### 7.6 ソートの代わりにループを使用して Min/Max を取得する (低い影響)

```typescript
// ❌ 悪い例: O(n log n)
const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
return sorted[0];

// ✅ 良い例: O(n)
let latest = projects[0];
for (const p of projects) {
  if (p.updatedAt > latest.updatedAt) latest = p;
}
return latest;
```

### 7.7 不変性のための toSorted() の使用 (中程度の影響)

`.sort()` は配列を破壊的に変更するため、React の不変性モデルを壊します。

```typescript
// ❌ 悪い例: 元の配列を破壊する
const sorted = users.sort((a, b) => a.name.localeCompare(b.name));

// ✅ 良い例: 新しい配列を作成する
const sorted = users.toSorted((a, b) => a.name.localeCompare(b.name));
```

## 8. 高度なパターン

### 8.1 useEffectEvent による安定したコールバック参照 (低い影響)

コールバックの変更によって Effect が再購読されないようにするには、コールバックを ref に保存してください。

```tsx
import { useEffectEvent } from "react";

function useWindowEvent(event: string, handler: () => void) {
  const onEvent = useEffectEvent(handler);

  useEffect(() => {
    window.addEventListener(event, onEvent);
    return () => window.removeEventListener(event, onEvent);
  }, [event]);
}
```

</react-best-practices>
