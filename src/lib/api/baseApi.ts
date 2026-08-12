import axios, { AxiosError } from "axios";

import { ApiError } from "./apiError";
import type { ApiEnvelope } from "./types";


export const baseApi = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "content-type": "application/json" },
});

baseApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiEnvelope & { error?: string }>) => {
    if (error.response) {
      const body = error.response.data;

      throw new ApiError(
        error.response.status,
        body?.message ?? error.message,
        body?.error
      );
    }

    throw new ApiError(0, "Could not reach the server. Check your connection.");
  }
);
