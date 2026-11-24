import { env } from "../config/env.js";
import { ApiError } from "./ApiError.js";

interface ImgbbResponse {
  success: boolean;
  data?: { url: string };
  error?: { message?: string };
}

export async function uploadToImgbb(file: Buffer, originalName: string): Promise<string> {
  const form = new FormData();
  form.append("image", file.toString("base64"));
  form.append("name", originalName.replace(/\.[^/.]+$/, ""));

  let response: Response;
  try {
    response = await fetch(`https://api.imgbb.com/1/upload?key=${env.IMGBB_API_KEY}`, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new ApiError(502, "Could not reach the image hosting service");
  }

  const result = (await response.json().catch(() => null)) as ImgbbResponse | null;

  if (!response.ok || !result?.success || !result.data?.url) {
    throw new ApiError(502, result?.error?.message ?? "Image upload failed");
  }

  return result.data.url;
}