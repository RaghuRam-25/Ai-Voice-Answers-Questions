'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await authService.login(email, password);
      localStorage.setItem('token', res.token);
      router.push('/assistant');
    } catch (err: any) {
      setError(err?.response?.data?.error || t.authFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">

        {/* Floating glow behind card */}
        <div
          aria-hidden
          className="absolute -z-10 w-80 h-80 rounded-full -translate-x-1/2 -translate-y-1/2"
          style={{
            background: 'radial-gradient(ellipse at center, var(--primary-glow), transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="card p-7 md:p-8 hover:transform-none inset-ring"
        >
          {/* Logo + title */}
          <div className="text-center mb-6">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 inset-ring"
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                boxShadow: '0 6px 24px -8px var(--primary-glow)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              {mode === 'login' ? t.welcomeBack : t.createAccount}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {mode === 'login'
                ? t.signInSub
                : t.registerSub}
            </p>
          </div>

          {/* Mode toggle */}
          <div
            className="flex p-1 rounded-xl mb-6"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
          >
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-all duration-150"
                style={
                  mode === m
                    ? { background: 'var(--bg-overlay)', color: 'var(--text)', boxShadow: '0 1px 4px hsla(0,0%,0%,0.3)' }
                    : { color: 'var(--text-muted)' }
                }
              >
                {m === 'login' ? t.signIn : t.register}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 px-3.5 py-3 rounded-xl text-xs"
              style={{
                background: 'hsla(0,70%,56%,0.08)',
                border: '1px solid hsla(0,70%,56%,0.2)',
                color: 'hsl(0,70%,72%)',
              }}
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="label">{t.password}</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label={showPw ? t.hidePassword : t.showPassword}
                >
                  {showPw
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5 mt-2 text-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                <><LogIn className="w-4 h-4" /> {t.signIn}</>
              ) : (
                <><UserPlus className="w-4 h-4" /> {t.createAccount}</>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}