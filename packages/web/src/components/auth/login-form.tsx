"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type FormMode = "login" | "signup";

/** メール + パスワード認証フォーム */
export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<FormMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error: authError } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (authError) {
      setError(
        mode === "login"
          ? "メールアドレスまたはパスワードが正しくありません。"
          : "アカウント作成に失敗しました。別のメールアドレスをお試しください。",
      );
      return;
    }

    if (mode === "signup") {
      setError(null);
      setMode("login");
      // サインアップ成功メッセージを表示
      setError("確認メールを送信しました。メールを確認してからログインしてください。");
      return;
    }

    router.push("/");
    router.refresh();
  }

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          メールアドレス
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          パスワード
        </label>
        <Input
          id="password"
          type="password"
          placeholder="8文字以上"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full bg-warm-coral text-white hover:bg-warm-coral/90" disabled={loading}>
        {loading
          ? "処理中..."
          : mode === "login"
            ? "ログイン"
            : "アカウント作成"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            アカウントをお持ちでない方は
            <button
              type="button"
              onClick={toggleMode}
              className="ml-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              新規登録
            </button>
          </>
        ) : (
          <>
            既にアカウントをお持ちの方は
            <button
              type="button"
              onClick={toggleMode}
              className="ml-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              ログイン
            </button>
          </>
        )}
      </p>
    </form>
  );
}
