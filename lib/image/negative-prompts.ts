import type { ImageIntent } from "@/lib/image/intents"

const BASE = [
  "wrong subject",
  "unrelated object",
  "blurry",
  "low detail",
  "bad composition",
  "cropped main subject",
  "out of frame",
  "duplicate subject",
  "visual artifacts",
  "random text",
  "gibberish typography",
  "watermark",
]

const BY_INTENT: Partial<Record<ImageIntent, string[]>> = {
  realistic_photo: ["cgi look", "plastic skin", "distorted anatomy", "extra limbs", "missing limbs", "deformed face", "unnatural perspective"],
  portrait: ["asymmetrical eyes", "deformed face", "bad teeth", "extra fingers", "fused fingers", "waxy skin", "uncanny face"],
  product: ["warped product", "wrong proportions", "extra parts", "floating object", "dirty background", "unreadable packaging"],
  logo: ["photo mockup", "3d scene", "busy background", "too many details", "random letters", "gradient overload"],
  marketing: ["clutter", "too much text", "illegible typography", "weak focal point", "busy background", "random icons"],
  thumbnail: ["tiny subject", "low contrast", "too many elements", "busy background", "small unreadable text"],
  flyer: ["dense layout", "tiny text", "poor hierarchy", "random text blocks", "clutter"],
  cover: ["weak focal point", "generic stock feel", "busy composition", "illegible title area"],
  illustration: ["broken silhouette", "incoherent anatomy", "muddy shapes", "accidental photorealism"],
  concept: ["unrelated symbolism", "meaningless abstract blob", "confusing focal point"],
}

export function getNegativePrompt(intent: ImageIntent) {
  return [...BASE, ...(BY_INTENT[intent] || [])].join(", ")
}
