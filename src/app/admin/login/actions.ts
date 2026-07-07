"use server";

import { redirect } from "next/navigation";
import {
  checkPassword,
  createSession,
  destroySession,
} from "@/lib/auth/session";

export interface LoginState {
  status: "idle" | "error";
  message?: string;
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "");

  if (!checkPassword(password)) {
    // Unlike checkout/create, NO fields echo here — a password never goes
    // back into action state (it would sit in the RSC payload). React 19's
    // post-action form reset clearing the field is the desired behavior for
    // once.
    return { status: "error", message: "Wrong password." };
  }

  await createSession();

  // Open-redirect guard: `from` came from the URL, i.e. from anyone. Only
  // same-site paths are honored — "//evil.example" parses as a protocol-
  // relative URL, hence the second check.
  const target = from.startsWith("/") && !from.startsWith("//")
    ? from
    : "/products";
  redirect(target);
}

// A Server Action used directly as a <form action> with no state hooks at
// all — the simplest possible mutation wiring, and it works without JS.
export async function logout(): Promise<void> {
  await destroySession();
  redirect("/products");
}
