"use client";

import { useEffect, useRef, useState } from "react";

type GoogleSignInButtonProps = {
  onSuccess?: (idToken: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  mode?: "login" | "register";
};

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      shape?: "rectangular" | "pill" | "circle" | "square";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      width?: number;
      locale?: string;
    },
  ) => void;
  prompt?: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const SCRIPT_ID = "google-gsi-client";

function loadGoogleScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window unavailable"));
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google script failed to load")), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google script failed to load"));
    document.head.appendChild(script);
  });
}

export default function GoogleSignInButton({
  onSuccess,
  onError,
  disabled,
  mode = "login",
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!clientId || disabled) return;

    let cancelled = false;

    async function handleCredential(credential?: string) {
      if (!credential) {
        onErrorRef.current?.("Google không trả về credential.");
        return;
      }

      setLoading(true);
      try {
        if (onSuccessRef.current) {
          await onSuccessRef.current(credential);
        }
      } catch (err) {
        onErrorRef.current?.(
          err instanceof Error ? err.message : "Đăng nhập Google thất bại",
        );
      } finally {
        setLoading(false);
      }
    }

    async function setup() {
      try {
        await loadGoogleScript();
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            void handleCredential(response.credential);
          },
          ux_mode: "popup",
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        buttonRef.current.innerHTML = "";
        const width = Math.min(Math.max(buttonRef.current.offsetWidth || 340, 260), 380);
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: mode === "register" ? "signup_with" : "signin_with",
          width,
          locale: "vi",
        });
        setReady(true);
      } catch {
        if (!cancelled) {
          onErrorRef.current?.("Không thể tải Google Sign-In SDK");
        }
      }
    }

    void setup();

    return () => {
      cancelled = true;
    };
  }, [clientId, disabled, mode]);

  // If clientId is not provided in env, display styled manual button with prompt instruction
  if (!clientId) {
    return (
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => {
          onErrorRef.current?.(
            "Vui lòng cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID trong biến môi trường (.env.local)",
          );
        }}
        className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2.5 transition-all hover:bg-opacity-80 active:scale-[0.99]"
        style={{
          backgroundColor: "#111320",
          color: "#c0c7e2",
          border: "1px solid #1e2240",
        }}
      >
        <GoogleIcon />
        <span>{mode === "register" ? "Đăng ký với Google" : "Tiếp tục với Google"}</span>
      </button>
    );
  }

  return (
    <div className="space-y-2 w-full">
      <div
        ref={buttonRef}
        className="flex min-h-[44px] w-full items-center justify-center overflow-hidden"
        aria-busy={loading || !ready}
      />
      {loading && (
        <p className="text-center text-xs" style={{ color: "#9b94ff" }}>
          Đang xác thực tài khoản Google…
        </p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
