"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PASSWORD_RESET_EMAIL_KEY } from "@/pages/ForgotPassword";
import type { LoginSuccessPayload } from "@/contexts/AuthContext";
import { getOrCreateDeviceId } from "@/utils/deviceId";

const Login = () => {
  const navigate = useNavigate();
  const { login, completeLoginFromResponse, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<"credentials" | "2fa">("credentials");
  const [twoFactorEmail, setTwoFactorEmail] = useState("");
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const result = await login(email, password);
      if (result.status === "needs_two_factor") {
        setTwoFactorEmail(result.email);
        setDevOtpHint(result.devOtp ?? null);
        setPhase("2fa");
        setOtpCode("");
        return;
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otpCode.trim()) {
      setError("Enter the verification code");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("http://localhost:8080/api/auth/verify-2fa-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: twoFactorEmail,
          code: otpCode.trim(),
          deviceId: getOrCreateDeviceId(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Verification failed");
      }
      completeLoginFromResponse(data as unknown as LoginSuccessPayload);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const backToCredentials = () => {
    setPhase("credentials");
    setOtpCode("");
    setDevOtpHint(null);
    setError(null);
  };

  const handleForgotPassword = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Enter your email address first, then choose Forgot password.");
      return;
    }
    setForgotSending(true);
    try {
      const res = await fetch("http://localhost:8080/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(typeof data.message === "string" ? data.message : "Could not send reset email");
      }
      try {
        sessionStorage.setItem(PASSWORD_RESET_EMAIL_KEY, email.trim());
      } catch {
        /* private mode */
      }
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setForgotSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* ── Logo & Title — exactly as original ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 mb-4 rounded-full bg-white shadow-md ring-2 ring-blue-900/10 p-1.5">
            <img
              src="/images/undj-logo.png"
              alt="Logo of the University of N'Djamena (UNDJ)"
              className="w-full h-full object-contain"
              width={128}
              height={128}
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Université de N&apos;Djamena</h1>
          <p className="text-gray-600 mt-2">Academic Management System</p>
        </div>

        {/* ── Form card — system style ── */}
        <div className="bg-white border border-gray-300">

          {/* Sub-header bar */}
          <div className="bg-gray-700 px-6 py-3 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-white">
              {phase === "credentials" ? "Sign in" : "Verify this device"}
            </h2>
            {phase === "2fa" && (
              <span className="text-[11px] text-gray-300 font-normal">2-Factor Authentication</span>
            )}
          </div>
          <div className="h-1.5 bg-gray-800" />

          <div className="px-6 py-5 space-y-4">

            {phase === "2fa" && (
              <p className="text-[12px] text-gray-600 bg-blue-50 border border-blue-200 px-3 py-2">
                Two-factor authentication is required because this browser has not been used on
                your account before (or trusted devices were cleared). Enter the code from your email.
              </p>
            )}

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-300 text-[13px] text-red-700 font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {phase === "credentials" ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-[12px] font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@university.ac.td"
                    className="w-full px-3 py-2 border border-gray-300 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-transparent bg-white"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-[12px] font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-3 py-2 border border-gray-300 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-transparent bg-white pr-14"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-500 hover:text-gray-800 uppercase tracking-wide"
                      disabled={isLoading}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="border-gray-300 text-cyan-600 focus:ring-cyan-600"
                      disabled={isLoading}
                    />
                    <span className="text-[12px] text-gray-600">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleForgotPassword()}
                    disabled={isLoading || forgotSending}
                    className="text-[12px] font-semibold text-cyan-700 hover:text-cyan-900 disabled:opacity-50"
                  >
                    {forgotSending ? "Sending…" : "Forgot password?"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gray-800 text-white py-2 px-4 text-[13px] font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading && (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {isLoading ? "Signing in…" : "Sign in"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerify2fa} className="space-y-4">
                <div>
                  <label htmlFor="otp" className="block text-[12px] font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Verification Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit code"
                    className="w-full px-3 py-2 border border-gray-300 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-transparent bg-white tracking-widest font-mono"
                    disabled={verifying}
                  />
                </div>

                {devOtpHint && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2">
                    Dev only: your code is{" "}
                    <span className="font-mono font-bold">{devOtpHint}</span>{" "}
                    (also in server logs).
                  </p>
                )}

                <button
                  type="submit"
                  disabled={verifying}
                  className="w-full bg-gray-800 text-white py-2 px-4 text-[13px] font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {verifying && (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {verifying ? "Verifying…" : "Verify and continue"}
                </button>

                <button
                  type="button"
                  onClick={backToCredentials}
                  className="w-full text-[12px] font-semibold text-gray-600 hover:text-gray-900 py-1.5 border border-gray-300 hover:bg-gray-50 transition-colors"
                  disabled={verifying}
                >
                  ← Back to sign in
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white/60 border border-gray-300 border-t-0">
          <p className="text-[11px] text-gray-500 text-center">
            © 2026 Université de N&apos;Djamena. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;