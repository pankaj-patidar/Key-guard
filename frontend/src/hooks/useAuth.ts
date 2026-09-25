import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export function useLogin() {
  const { setTokens, setUser } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (creds: { email: string; password: string }) =>
      api.post("/auth/login", creds).then(r => r.data),
    onSuccess: async (data) => {
      setTokens(data.access_token, data.refresh_token);
      const me = await api.get("/auth/me").then(r => r.data);
      setUser(me);
      navigate("/");
    },
    onError: () => toast.error("Invalid email or password"),
  });
}

export function useMe() {
  const { setUser } = useAuthStore();
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.get("/auth/me").then(r => { setUser(r.data); return r.data; }),
    enabled: !!localStorage.getItem("access_token"),
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  return () => { logout(); navigate("/login"); };
}
