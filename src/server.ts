import { createRequestHandler } from "react-router";
// @ts-expect-error
import * as build from "virtual:react-router/server-build";

const handler = createRequestHandler({
  ...build,
  allowedActionOrigins:
    process.env.HANLEC_APP_HOSTS != null
      ? (JSON.parse(process.env.HANLEC_APP_HOSTS) as string[])
      : ["**"],
});

export default {
  async fetch(request: Request) {
    return handler(request);
  },
};
