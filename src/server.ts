import { createRequestHandler } from "react-router";
// @ts-expect-error
import * as build from "virtual:react-router/server-build";

const APP_HOST = process.env.HANLEC_APP_HOST;

const handler = createRequestHandler({
  ...build,
  allowedActionOrigins: APP_HOST != null ? APP_HOST : ["**"],
});

export default {
  async fetch(request: Request) {
    return handler(request);
  },
};
