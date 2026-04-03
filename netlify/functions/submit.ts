import { fal } from "@fal-ai/client";
import type { Config, Context } from "@netlify/functions";

fal.config({ credentials: () => process.env.FAL_KEY || "" });

const MODEL_ID = "fal-ai/pulid";

export default async (req: Request, _context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { image, prompt } = (await req.json()) as {
      image: string;
      prompt: string;
    };

    if (!image || !prompt) {
      return new Response(
        JSON.stringify({ error: "Image and prompt are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Convert base64 data URL to Blob
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const blob = new Blob([buffer], { type: mimeType });

    // Upload to fal.storage
    const imageUrl = await fal.storage.upload(blob);

    // Submit 4 parallel queue jobs using PuLID for face consistency
    const submissions = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        fal.queue.submit(MODEL_ID, {
          input: {
            reference_images: [{ image_url: imageUrl }],
            prompt,
            num_images: 1,
            id_scale: 0.8,
            mode: "fidelity",
            guidance_scale: 1.2,
            num_inference_steps: 4,
          },
        })
      )
    );

    const requestIds = submissions
      .filter(
        (s): s is PromiseFulfilledResult<{ request_id: string }> =>
          s.status === "fulfilled"
      )
      .map((s) => s.value.request_id);

    if (requestIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Failed to submit generation jobs" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ requestIds }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Submit error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config: Config = {
  path: "/api/submit",
  method: ["POST", "OPTIONS"],
};
