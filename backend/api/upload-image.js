export const config = {
  runtime: "edge",
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function jsonResponse(body, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders,
    },
  });
}

function getAllowedOrigins() {
  return (process.env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getCorsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = allowedOrigins.includes(origin);

  return {
    isAllowed: !origin || isAllowed,
    headers: isAllowed
      ? {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type, authorization, x-upload-token",
          "access-control-max-age": "86400",
          vary: "Origin",
        }
      : {},
  };
}

function isAuthorized(request) {
  const uploadToken = process.env.UPLOAD_TOKEN;
  if (!uploadToken) return true;

  const authorization = request.headers.get("authorization") || "";
  const bearerToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const headerToken = request.headers.get("x-upload-token") || "";

  return bearerToken === uploadToken || headerToken === uploadToken;
}

export default async function handler(request) {
  const cors = getCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: cors.isAllowed ? 204 : 403,
      headers: cors.headers,
    });
  }

  if (!cors.isAllowed) {
    return jsonResponse({ message: "Origin tidak diizinkan." }, 403);
  }

  if (request.method !== "POST") {
    return jsonResponse({ message: "Method tidak diizinkan." }, 405, cors.headers);
  }

  if (!process.env.IMGBB_API_KEY) {
    return jsonResponse({ message: "IMGBB_API_KEY belum diatur di backend." }, 500, cors.headers);
  }

  if (!isAuthorized(request)) {
    return jsonResponse({ message: "Tidak diizinkan upload gambar." }, 401, cors.headers);
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return jsonResponse({ message: "Gunakan multipart/form-data dengan field image." }, 400, cors.headers);
  }

  const formData = await request.formData();
  const image = formData.get("image");

  if (!image || typeof image === "string") {
    return jsonResponse({ message: "File gambar tidak ditemukan." }, 400, cors.headers);
  }

  if (!ALLOWED_TYPES.has(image.type)) {
    return jsonResponse({ message: "Format gambar harus JPG, PNG, WebP, atau GIF." }, 400, cors.headers);
  }

  if (image.size > MAX_IMAGE_SIZE) {
    return jsonResponse({ message: "Ukuran gambar maksimal 5MB." }, 400, cors.headers);
  }

  const imgbbFormData = new FormData();
  imgbbFormData.append("image", image);

  const uploadResponse = await fetch(
    `https://api.imgbb.com/1/upload?key=${encodeURIComponent(process.env.IMGBB_API_KEY)}`,
    {
      method: "POST",
      body: imgbbFormData,
    }
  );

  const uploadResult = await uploadResponse.json().catch(() => null);

  if (!uploadResponse.ok) {
    return jsonResponse(
      {
        message: uploadResult?.error?.message || "Gagal upload gambar ke ImgBB.",
      },
      uploadResponse.status,
      cors.headers
    );
  }

  return jsonResponse(
    {
      url: uploadResult.data.url,
      displayUrl: uploadResult.data.display_url,
      deleteUrl: uploadResult.data.delete_url,
    },
    200,
    cors.headers
  );
}
