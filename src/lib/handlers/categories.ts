import { baseApi } from "@/lib/api/baseApi";
import type {
  ApiEnvelope,
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/lib/api/types";

export async function getCategories(): Promise<ApiEnvelope<Category[]>> {
  const res = await baseApi.get<ApiEnvelope<Category[]>>("/categories");
  return res.data;
}

export async function createCategory(
  input: CreateCategoryInput
): Promise<ApiEnvelope<Category>> {
  const res = await baseApi.post<ApiEnvelope<Category>>("/categories", input);
  return res.data;
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<ApiEnvelope<Category>> {
  const res = await baseApi.patch<ApiEnvelope<Category>>(
    `/categories/${id}`,
    input
  );
  return res.data;
}
