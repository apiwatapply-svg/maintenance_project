"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSessionConfig, getStoredSession } from "@/lib/session";

export default function AdminIndexPage() {
  const router = useRouter();
  const config = getSessionConfig("admin");

  useEffect(() => {
    if (!getStoredSession("admin")) {
      router.replace(config.loginPath);
      return;
    }

    router.replace("/admin/users");
  }, [config.loginPath, router]);

  return null;
}
