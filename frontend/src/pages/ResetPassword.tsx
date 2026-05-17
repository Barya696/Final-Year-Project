import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PASSWORD_RESET_EMAIL_KEY } from "@/pages/ForgotPassword";
import { useAuth } from "@/contexts/AuthContext";
import type { LoginSuccessPayload } from "@/contexts/AuthContext";
import { getOrCreateDeviceId } from "@/utils/deviceId";

const API = "http://localhost:8080";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeLoginFromResponse } = useAuth();
  const emailFromUrl = (searchParams.get("email") ?? "").trim();
  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const e = (searchParams.get("email") ?? "").trim();
    if (e) setEmail(e);
  }, [searchParams]);

  useEffect(() => {
    if (!emailFromUrl) {
      try {
        const saved = sessionStorage.getItem(PASSWORD_RESET_EMAIL_KEY)?.trim() ?? "";
        if (saved) setEmail(saved);
      } catch {
        // ignore storage access issues in private mode
      }
    }
  }, [emailFromUrl]);

  const codeOk = /^\d{6}$/.test(code.trim());
  const canSubmit = email.trim().length > 0 && codeOk && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Enter the same email address you used on the forgot-password page.");
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/auth/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          deviceId: getOrCreateDeviceId(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not verify code");
      }
      completeLoginFromResponse(data as unknown as LoginSuccessPayload);
      setDone(true);
      setTimeout(() => navigate("/"), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo & Title */}
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

        {/* Card */}
        <div className="bg-white border border-gray-300">

          {/* Sub-header bar */}
          <div className="bg-gray-700 px-6 py-3">
            <h2 className="text-[14px] font-semibold text-white">Verification code</h2>
          </div>
          <div className="h-1.5 bg-gray-800" />

          <div className="px-6 py-5 space-y-4">

            <p className="text-[12px] text-gray-600 bg-blue-50 border border-blue-200 px-3 py-2">
              Enter the <span className="font-semibold text-gray-800">6-digit verification code</span> we
              sent to your email address.
            </p>

            {done && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-300 text-[13px] text-green-800 font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Code verified successfully.
              </div>
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

            {!done && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="code" className="block text-[12px] font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Verification Code
                  </label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => onCodeChange(e.target.value)}
                    placeholder="000000"
                    className="w-full px-3 py-2 border border-gray-300 text-[18px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-transparent bg-white tracking-[0.5em] font-mono text-center"
                    disabled={submitting}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Six digits from the email, no spaces.</p>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full bg-gray-800 text-white py-2 px-4 text-[13px] font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting && (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {submitting ? "Verifying…" : "Verify code"}
                </button>
              </form>
            )}

            <Link
              to="/login"
              className="w-full text-[12px] font-semibold text-gray-600 hover:text-gray-900 py-1.5 border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center"
            >
              ← Back to sign in
            </Link>
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

export default ResetPassword;