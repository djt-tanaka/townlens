export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold text-slate-900">TownLens</h1>
      <p className="mt-4 text-lg text-slate-600">
        子育て世帯のための街えらび比較ツール
      </p>
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Web版は現在開発中です。CLIでの利用は引き続き可能です。
        </p>
      </div>
    </main>
  );
}
