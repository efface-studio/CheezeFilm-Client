import { redirect } from "next/navigation";

/**
 * V1 was retired (see issue #25). The root path permanently forwards to
 * /v2, the only canonical surface. We do this in a Server Component so
 * the redirect happens server-side — search engines see a 308 instead
 * of a client-side flicker.
 */
export default function Root() {
  redirect("/v2");
}
