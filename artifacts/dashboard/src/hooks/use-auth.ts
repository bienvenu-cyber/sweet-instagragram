import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AuthStatus, LoginRequest, LoginResponse, StatusMessage, AccountInfo } from "@workspace/api-client-react";

const BASE_URL = "/bot-api";

export function useAuthStatus() {
  return useQuery({
    queryKey: ["auth-status"],
    queryFn: async (): Promise<AuthStatus> => {
      const res = await fetch(`${BASE_URL}/auth/status`);
      if (!res.ok) throw new Error("Failed to fetch auth status");
      return res.json();
    },
    retry: false,
  });
}

export function useAccount() {
  return useQuery({
    queryKey: ["account-info"],
    queryFn: async (): Promise<AccountInfo> => {
      const res = await fetch(`${BASE_URL}/account`);
      if (!res.ok) throw new Error("Failed to fetch account info");
      return res.json();
    },
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: LoginRequest): Promise<LoginResponse> => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Login failed");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-status"] });
      queryClient.invalidateQueries({ queryKey: ["account-info"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<StatusMessage> => {
      const res = await fetch(`${BASE_URL}/auth/logout`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to logout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-status"] });
      queryClient.invalidateQueries({ queryKey: ["account-info"] });
    },
  });
}
