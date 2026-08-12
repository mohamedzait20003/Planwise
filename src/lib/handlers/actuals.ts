import { baseApi } from "@/lib/api/baseApi";
import type {
  Actual,
  ApiEnvelope,
  CreateActualInput,
  ImportResult,
  UpdateActualInput,
} from "@/lib/api/types";

export async function getActuals(
  month?: string,
  categoryId?: string
): Promise<ApiEnvelope<Actual[]>> {
  const res = await baseApi.get<ApiEnvelope<Actual[]>>("/actuals", {
    params: { month, categoryId },
  });
  return res.data;
}

export async function createActual(
  input: CreateActualInput
): Promise<ApiEnvelope<Actual>> {
  const res = await baseApi.post<ApiEnvelope<Actual>>("/actuals", input);
  return res.data;
}

export async function updateActual(
  id: string,
  input: UpdateActualInput
): Promise<ApiEnvelope<Actual>> {
  const res = await baseApi.patch<ApiEnvelope<Actual>>(`/actuals/${id}`, input);
  return res.data;
}

export async function deleteActual(
  id: string
): Promise<ApiEnvelope<undefined>> {
  const res = await baseApi.delete<ApiEnvelope<undefined>>(`/actuals/${id}`);
  return res.data;
}

export async function importActuals(
  file: File
): Promise<ApiEnvelope<ImportResult>> {
  const form = new FormData();
  form.append("file", file);

  const res = await baseApi.post<ApiEnvelope<ImportResult>>(
    "/actuals/import",
    form,
    { headers: { "content-type": undefined } }
  );
  return res.data;
}
