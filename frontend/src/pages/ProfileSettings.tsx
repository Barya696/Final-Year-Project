"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, Lock, ZoomIn, LogOut, User } from "lucide-react";
import { useFontSize } from "@/contexts/FontSizeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/utils/translations";
import {
  confirmPasswordFieldOutlineClass,
  isPasswordAllowedByPolicy,
  newPasswordFieldOutlineClass,
  passwordMeetsPolicy,
  type PasswordPolicyDTO,
} from "@/utils/passwordPolicy";

/* ── Section wrapper ─────────────────────────────────────────────────── */
const Section = ({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white border border-gray-300">
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50">
      <div className="w-1 h-4 bg-gray-800 shrink-0" />
      <Icon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">{label}</span>
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

/* ── Labelled read-only field ────────────────────────────────────────── */
const InfoField = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">{label}</span>
    <p className="text-[13px] font-semibold text-gray-900 py-1.5 border-b border-gray-200">
      {value || <span className="text-gray-400 font-normal italic">—</span>}
    </p>
  </div>
);

/* ── Password hint line ──────────────────────────────────────────────── */
const Hint = ({ ok, text }: { ok: boolean; text: string }) => (
  <p className={`text-[12px] font-medium ${ok ? "text-green-700" : "text-red-600"}`} role="status">
    {ok ? "✓" : "✗"} {text}
  </p>
);

/* ── Toast ───────────────────────────────────────────────────────────── */
const Toast = ({ title, description, isError }: { title: string; description: string; isError?: boolean }) => (
  <div className="fixed top-4 right-4 z-50">
    <div
      className={`px-4 py-3 border shadow-lg max-w-sm ${
        isError
          ? "bg-amber-50 border-amber-300"
          : "bg-green-50 border-green-300"
      }`}
    >
      <p className={`text-[13px] font-bold ${isError ? "text-amber-900" : "text-green-800"}`}>{title}</p>
      <p className={`text-[12px] mt-0.5 ${isError ? "text-amber-800" : "text-green-700"}`}>{description}</p>
    </div>
  </div>
);

/* ── Logout dialog ───────────────────────────────────────────────────── */
const LogoutDialog = ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white border border-gray-300 shadow-xl w-full max-w-sm mx-4">
      {/* header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 bg-gray-50">
        <div className="w-1 h-5 bg-gray-800 shrink-0" />
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-gray-800">Confirm Logout</h2>
      </div>
      {/* body */}
      <div className="px-5 py-5">
        <p className="text-[13px] text-gray-600 leading-relaxed">
          Are you sure you want to end your session? You will need to sign in again to access the system.
        </p>
      </div>
      {/* footer */}
      <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 text-[13px] font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-5 py-2 text-[13px] font-semibold bg-gray-800 text-white hover:bg-gray-700 transition-colors"
        >
          Confirm Logout
        </button>
      </div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════
   SETTINGS (inner)
══════════════════════════════════════════════════════════════════════ */
const Settings = ({
  showToast,
}: {
  showToast: (title: string, description: string, isError?: boolean) => void;
}) => {
  const { apiFetch, user } = useAuth();
  const { fontSize, setFontSize } = useFontSize();
  const { language, setLanguage } = useLanguage();

  const [currentPassword,  setCurrentPassword]  = useState("");
  const [newPassword,      setNewPassword]      = useState("");
  const [confirmPassword,  setConfirmPassword]  = useState("");
  const [passwordBusy,     setPasswordBusy]     = useState(false);
  const [policy,           setPolicy]           = useState<PasswordPolicyDTO | null>(null);

  const loadPasswordPolicy = useCallback(async () => {
    try {
      const res = await apiFetch("http://localhost:8080/api/auth/password-policy");
      if (!res.ok) return;
      const data = (await res.json()) as PasswordPolicyDTO;
      setPolicy({
        minPasswordLength:        Number(data.minPasswordLength) || 8,
        requireUppercase:         Boolean(data.requireUppercase),
        requireNumbers:           Boolean(data.requireNumbers),
        requireSpecialCharacters: Boolean(data.requireSpecialCharacters),
      });
    } catch { /* optional */ }
  }, [apiFetch]);

  useEffect(() => { void loadPasswordPolicy(); }, [loadPasswordPolicy]);

  const newPasswordPassesPolicy  = passwordMeetsPolicy(newPassword, policy);
  const showNewPasswordPolicyHint = policy != null && newPassword.length > 0;
  const confirmHasInput  = confirmPassword.length > 0;
  const confirmMatches   = confirmHasInput && newPassword === confirmPassword;
  const confirmMismatch  = confirmHasInput && !confirmMatches;

  const newPwOutline =
    policy == null || newPassword.length === 0
      ? "focus:border-gray-500"
      : newPasswordFieldOutlineClass(newPassword, newPasswordPassesPolicy);
  const confirmOutline = confirmPasswordFieldOutlineClass(confirmPassword, confirmMatches);

  const handleLanguageChange = (value: "english" | "arabic") => {
    setLanguage(value);
    const newLang = value === "english" ? "English" : "العربية";
    showToast(t(value, "languageUpdated"), `${t(value, "languageChangedTo")} ${newLang}.`);
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast(t(language, "validationError"), t(language, "allFieldsRequired"), true);
      return;
    }
    if (policy && !isPasswordAllowedByPolicy(newPassword, policy)) {
      showToast(t(language, "validationError"), "New password does not meet the security policy.", true);
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(t(language, "validationError"), t(language, "passwordsDoNotMatch"), true);
      return;
    }
    setPasswordBusy(true);
    try {
      const res = await apiFetch("http://localhost:8080/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        showToast(t(language, "validationError"), data.error || "Could not update password", true);
        return;
      }
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      showToast(t(language, "passwordUpdated"), data.message || t(language, "passwordChangedSuccess"));
    } catch {
      showToast(t(language, "validationError"), "Session ended or network error.", true);
    } finally {
      setPasswordBusy(false);
    }
  };

  const getFontSizeLabel = () => {
    if (fontSize <= 90) return "Small";
    if (fontSize <= 110) return "Medium";
    return "Large";
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 bg-white text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-500";

  return (
    <div className="space-y-4">

      {/* ── Row 1: User info + Language ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* User information */}
        <Section icon={User} label={t(language, "userInformation")}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <InfoField label={t(language, "fullName")}   value={user?.name ?? ""} />
            <InfoField label={t(language, "employeeID")} value={user ? `ID-${user.id}` : ""} />
            <InfoField label={t(language, "role")}       value={user?.displayRole ?? ""} />
            <InfoField label="Email"                     value={user?.email ?? ""} />
          </div>
        </Section>

        {/* Language */}
        <Section icon={Globe} label="Language Settings">
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-gray-500">Select the interface language for this session.</p>
            <div className="flex gap-2">
              {(["english", "arabic"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLanguageChange(lang)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border text-[13px] font-semibold transition-colors ${
                    language === lang
                      ? "bg-gray-800 border-gray-800 text-white"
                      : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  {lang === "english" ? "English" : "العربية"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 font-mono">
              Active: <span className="font-semibold text-gray-600">{language === "english" ? "English" : "العربية (Arabic)"}</span>
            </p>
          </div>
        </Section>
      </div>

      {/* ── Row 2: Security + Accessibility ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Security */}
        <Section icon={Lock} label="Security — Change Password">
          <div className="space-y-4 max-w-sm">
            {/* Current */}
            <div className="space-y-1">
              <label htmlFor="current-password" className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 block">
                Current password <span className="text-red-500">*</span>
              </label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className={inputClass}
              />
            </div>

            {/* New */}
            <div className="space-y-1">
              <label htmlFor="new-password" className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 block">
                New password <span className="text-red-500">*</span>
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                autoComplete="new-password"
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Type your new password"
                className={`${inputClass} ${newPwOutline}`}
                aria-invalid={policy != null && newPassword.length > 0 ? !newPasswordPassesPolicy : undefined}
              />
              {showNewPasswordPolicyHint && (
                <Hint
                  ok={newPasswordPassesPolicy}
                  text={newPasswordPassesPolicy ? "Meets security requirements" : "Does not meet security requirements"}
                />
              )}
            </div>

            {/* Confirm */}
            <div className="space-y-1">
              <label htmlFor="confirm-password" className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 block">
                Confirm new password <span className="text-red-500">*</span>
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                autoComplete="new-password"
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                aria-invalid={confirmMismatch || undefined}
                className={`${inputClass} ${confirmOutline}`}
              />
              {confirmMismatch && <Hint ok={false} text="Passwords do not match" />}
              {confirmMatches  && <Hint ok={true}  text="Matches new password" />}
            </div>

            <button
              type="button"
              onClick={() => void handlePasswordChange()}
              disabled={
                passwordBusy ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword ||
                (policy != null && !newPasswordPassesPolicy) ||
                confirmMismatch
              }
              className="px-5 py-2 text-[13px] font-semibold bg-gray-800 text-white hover:bg-gray-700 transition-colors disabled:opacity-40"
            >
              {passwordBusy ? "Updating…" : "Update Password"}
            </button>
          </div>
        </Section>

        {/* Accessibility */}
        <Section icon={ZoomIn} label="Accessibility — Font Size">
          <div className="space-y-5">
            <p className="text-[12px] text-gray-500">
              Adjust the interface text size to suit your preference. Changes apply immediately across the application.
            </p>

            {/* Current value display */}
            <div className="flex items-center justify-between border border-gray-200 px-4 py-3 bg-gray-50">
              <span className="text-[12px] font-semibold text-gray-600 uppercase tracking-wide">Current size</span>
              <span className="text-[13px] font-bold font-mono text-gray-900">
                {getFontSizeLabel()} — {fontSize}%
              </span>
            </div>

            {/* Slider */}
            <div className="space-y-2">
              <input
                type="range"
                min="80"
                max="130"
                step="10"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-300 appearance-none cursor-pointer accent-gray-800"
              />
              <div className="flex justify-between text-[11px] text-gray-400 font-semibold uppercase tracking-wide">
                <span>Small</span>
                <span>Medium</span>
                <span>Large</span>
              </div>
            </div>

            {/* Step buttons */}
            <div className="flex gap-2">
              {[80, 90, 100, 110, 120, 130].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFontSize(val)}
                  className={`flex-1 py-1.5 text-[11px] font-semibold border transition-colors ${
                    fontSize === val
                      ? "bg-gray-800 border-gray-800 text-white"
                      : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {val}%
                </button>
              ))}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   PROFILE SETTINGS (outer / default export)
══════════════════════════════════════════════════════════════════════ */
export default function ProfileSettings() {
  const { logout } = useAuth();
  const { language } = useLanguage();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [toast, setToast] = useState<{ title: string; description: string; isError?: boolean } | null>(null);

  const showToast = (title: string, description: string, isError = false) => {
    setToast({ title, description, isError });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-4">

      {showLogoutDialog && (
        <LogoutDialog
          onConfirm={() => { setShowLogoutDialog(false); logout(); }}
          onCancel={() => setShowLogoutDialog(false)}
        />
      )}

      {toast && <Toast {...toast} />}

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-[15px] font-bold text-gray-900 tracking-tight">
          {t(language, "profileSettings").toUpperCase()}
        </h1>
        <button
          type="button"
          onClick={() => setShowLogoutDialog(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          {t(language, "logout")}
        </button>
      </div>

      <Settings showToast={showToast} />
    </div>
  );
}