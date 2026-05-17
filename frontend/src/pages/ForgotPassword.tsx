"use client";

import { Navigate, useSearchParams } from "react-router-dom";

export const PASSWORD_RESET_EMAIL_KEY = "password_reset_email";

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get("email")?.trim();
  let email = emailFromQuery ?? "";

  if (!email) {
    try {
      email = sessionStorage.getItem(PASSWORD_RESET_EMAIL_KEY)?.trim() ?? "";
    } catch {
      email = "";
    }
  }

  const target = email ? `/reset-password?email=${encodeURIComponent(email)}` : "/reset-password";
  return <Navigate to={target} replace />;
};

export default ForgotPassword;
