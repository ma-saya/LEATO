'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Loader2, Mail, Lock, UserPlus, BookOpen, Check, X } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // パスワード強度チェック
  const passwordChecks = useMemo(() => ({
    length: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  }), [password]);

  const isPasswordStrong = passwordChecks.length && passwordChecks.hasLetter && passwordChecks.hasNumber;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // バリデーション
    if (!isPasswordStrong) {
      setError('パスワードの条件を満たしてください。');
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません。');
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('このメールアドレスは既に登録されています。');
        } else {
          setError(authError.message);
        }
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('アカウント作成中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  const CheckItem = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className={`flex items-center gap-1.5 text-xs transition-colors ${ok ? 'text-emerald-400' : 'text-muted-foreground'}`}>
      {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </div>
  );

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo / Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/25 mx-auto">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            アカウント作成
          </h1>
          <p className="text-foreground0 text-sm">
            StackLogで学習を管理しましょう
          </p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="space-y-5">
          <div className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="signup-email" className="block text-sm font-medium text-foreground/80">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground0" />
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-card border border-border text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="signup-password" className="block text-sm font-medium text-foreground/80">
                パスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground0" />
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-card border border-border text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
              {/* Password Strength */}
              {password.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 pl-1 pt-1">
                  <CheckItem ok={passwordChecks.length} label="8文字以上" />
                  <CheckItem ok={passwordChecks.hasLetter} label="英字を含む" />
                  <CheckItem ok={passwordChecks.hasNumber} label="数字を含む" />
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label htmlFor="signup-confirm" className="block text-sm font-medium text-foreground/80">
                パスワード（確認）
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground0" />
                <input
                  id="signup-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-card border border-border text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-xs text-red-400 pl-1">パスワードが一致しません</p>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium flex items-center justify-center gap-2 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                アカウント作成
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <p className="text-center text-sm text-foreground0">
          既にアカウントをお持ちの方は{' '}
          <Link
            href="/login"
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            ログイン
          </Link>
        </p>
      </div>
    </main>
  );
}
