import { createRequestHandler } from "react-router";
// @ts-expect-error
import * as build from "virtual:react-router/server-build";

const handler = createRequestHandler({
  ...build,
  // TODO(vitor): CSRF. Em prod talvez seja possível fazer com isto venha do
  // ambiente? v8_viteEnvironmentApi na Cloudflare?
  allowedActionOrigins: ["**"],
});

export default {
  async fetch(request: Request) {
    return handler(request);
  },
};
