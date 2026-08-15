import { baseApi } from "@/lib/api/baseApi";
import type {
  AdminOverview,
  AdminUser,
  AdminUserQuery,
  ApiEnvelope,
  Paged,
  UpdateAdminUserInput,
} from "@/lib/api/types";

/**
 * The admin console's requests.
 *
 * Every one of these answers 403 for a non-admin, which is worth stating here
 * because none of them checks anything client-side. Hiding the nav link is how
 * the console stays out of a normal user's way; `Auth("ADMIN")` on each route
 * is what keeps them out of it.
 */

export async function getOverview(): Promise<AdminOverview> {
  const res = await baseApi.get<ApiEnvelope<AdminOverview>>("/admin/overview");

  if (!res.data.data) throw new Error("The overview response carried no data");
  return res.data.data;
}

/**
 * One page of users.
 *
 * Undefined filters are dropped rather than sent as empty strings — axios
 * serializes `undefined` away, but an explicit `""` would reach the server as a
 * search for the empty needle and match every row on a `contains`.
 */
export async function getUsers(
  params: AdminUserQuery
): Promise<Paged<AdminUser>> {
  const res = await baseApi.get<ApiEnvelope<Paged<AdminUser>>>("/admin/users", {
    params: {
      query: params.query || undefined,
      role: params.role,
      verified: params.verified,
      page: params.page,
      perPage: params.perPage,
    },
  });

  if (!res.data.data) throw new Error("The users response carried no data");
  return res.data.data;
}

export async function getUser(id: string): Promise<ApiEnvelope<AdminUser>> {
  const res = await baseApi.get<ApiEnvelope<AdminUser>>(`/admin/users/${id}`);
  return res.data;
}

export async function updateUser(
  id: string,
  input: UpdateAdminUserInput
): Promise<ApiEnvelope<AdminUser>> {
  const res = await baseApi.patch<ApiEnvelope<AdminUser>>(
    `/admin/users/${id}`,
    input
  );

  return res.data;
}
