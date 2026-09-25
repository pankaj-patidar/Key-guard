import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, getAccessToken } from "@/lib/api";

export function useCredentialTypes() {
  return useQuery({
    queryKey: ["credential-types"],
    queryFn: () => api.get("/credentials/types").then(r => r.data),
    staleTime: Infinity,
  });
}

export function useProjectCredentials(projectId: string) {
  return useQuery({
    queryKey: ["credentials", "project", projectId],
    queryFn: () => api.get(`/credentials/project/${projectId}`).then(r => r.data),
    enabled: !!projectId,
  });
}

export function useGlobalCredentials() {
  return useQuery({
    queryKey: ["credentials", "global"],
    queryFn: () => api.get("/credentials/global").then(r => r.data),
  });
}

export function useCreateCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/credentials/", data).then(r => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["credentials"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Credential saved");
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Failed to save credential"),
  });
}

export function useUpdateCredential(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.patch(`/credentials/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["credentials"] }); toast.success("Credential updated"); },
    onError: () => toast.error("Failed to update credential"),
  });
}

export function useDeleteCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/credentials/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["credentials"] }); toast.success("Credential deleted"); },
    onError: () => toast.error("Failed to delete credential"),
  });
}

export function useRevealField() {
  return useMutation({
    mutationFn: ({ credentialId, fieldKey }: { credentialId: string; fieldKey: string }) =>
      api.post(`/credentials/${credentialId}/fields/${fieldKey}/reveal`).then(r => r.data),
    onError: () => toast.error("Could not reveal field"),
  });
}

export function useRevealAll() {
  return useMutation({
    mutationFn: (credentialId: string) =>
      api.post(`/credentials/${credentialId}/reveal`).then(r => r.data),
    onError: () => toast.error("Could not reveal credential"),
  });
}

export function useSnippets() {
  return useMutation({
    mutationFn: (credentialId: string) =>
      api.post(`/credentials/${credentialId}/snippets`).then(r => r.data),
    onError: () => toast.error("Could not generate snippets"),
  });
}

export async function exportField(credentialId: string, fieldKey: string, filename: string) {
  const base = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
  const res = await fetch(`${base}/credentials/${credentialId}/fields/${fieldKey}/export`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!res.ok) { toast.error("Export failed"); return; }
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast.success(`Downloaded ${filename}`);
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users/").then(r => r.data),
  });
}
