import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "ログイン",
  description: "TownLens にログインして、街の比較レポートを作成しましょう。",
  openGraph: {
    title: "ログイン",
    description: "TownLens にログインして、街の比較レポートを作成しましょう。",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
};

export default async function LoginPage() {
  // ログイン済みならトップページへリダイレクト
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">TownLens にログイン</CardTitle>
          <CardDescription>
            街の比較レポートを作成・保存するにはログインが必要です
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
