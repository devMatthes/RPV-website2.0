function json(body: object, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      ...headers,
    },
  });
}

export default {
  async fetch(request, env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path !== "/api/health") {
      return json({ error: "not_found" }, 404);
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "method_not_allowed" }, 405, { Allow: "GET, HEAD" });
    }

    const response = json({
      status: "ok",
      environment: env.ENVIRONMENT,
      phase: "infrastructure",
    });
    return request.method === "HEAD"
      ? new Response(null, { status: response.status, headers: response.headers })
      : response;
  },
} satisfies ExportedHandler<Env>;
