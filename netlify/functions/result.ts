import { fal } from "@fal-ai/client";

fal.config({ credentials: () => process.env.FAL_KEY || "" });

const MODEL_ID = "fal-ai/flux-2-flex/edit";

interface FalImage {
  url: string;
  width: number;
  height: number;
}

interface FalResult {
  images: FalImage[];
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { requestId } = (await req.json()) as { requestId: string };

    if (!requestId) {
      return new Response(
        JSON.stringify({ error: "requestId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check status
    const status = await fal.queue.status(MODEL_ID, {
      requestId,
      logs: false,
    });

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result<FalResult>(MODEL_ID, {
        requestId,
      });
      const imageUrl = result.data?.images?.[0]?.url;

      return new Response(
        JSON.stringify({ status: "completed", image: imageUrl }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (status.status === "FAILED") {
      return new Response(JSON.stringify({ status: "failed" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Still processing
    return new Response(JSON.stringify({ status: "pending" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Result error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
