"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  ACCOUNT_ERROR_CODES,
  ACCOUNT_SUCCESS_CODES,
  type AccountErrorCode,
  type AccountSuccessCode,
} from "@/lib/constants/platforms";

function isAccountErrorCode(value: string): value is AccountErrorCode {
  return value in ACCOUNT_ERROR_CODES;
}

function isAccountSuccessCode(value: string): value is AccountSuccessCode {
  return value in ACCOUNT_SUCCESS_CODES;
}

export function AccountsFeedback() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const error = searchParams.get("error");
    const success = searchParams.get("success");

    if (error && isAccountErrorCode(error)) {
      toast.error(ACCOUNT_ERROR_CODES[error]);
    } else if (error) {
      toast.error(ACCOUNT_ERROR_CODES.unknown);
    }

    if (success && isAccountSuccessCode(success)) {
      toast.success(ACCOUNT_SUCCESS_CODES[success]);
    }

    if (error || success) {
      router.replace("/accounts", { scroll: false });
    }
  }, [router, searchParams]);

  return null;
}
