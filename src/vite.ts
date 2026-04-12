import { createRequest, sendResponse } from "@remix-run/node-fetch-server";
import type { Plugin } from "vite";
import { consoleForwardPlugin } from "vite-console-forward-plugin";
import path from "node:path";

const IS_SANDBOX = !!process.env.HANLEC_IS_SANDBOX;
const SERVER = path.join(import.meta.dirname, "server.js");

export function hanlec(): Plugin[] {
  return [
    {
      name: "hanlec:server",
      config(_config, env) {
        return {
          ssr: {
            noExternal: env.command === "build" ? true : undefined,
          },
          environments: {
            ssr: {
              build: {
                rollupOptions: {
                  input: SERVER,
                },
              },
            },
          },
        };
      },
      configureServer(server) {
        return async () => {
          const mod = await server.ssrLoadModule(SERVER);

          server.middlewares.use(async (req, res, next) => {
            try {
              const request = createRequest(req, res);
              const response = await mod.default.fetch(request);
              await sendResponse(res, response);
            } catch (e) {
              next(e);
            }
          });
        };
      },
    },
    ...(IS_SANDBOX
      ? [
          {
            name: "hanlec:sandbox",
            config() {
              return {
                clearScreen: false,
                server: {
                  host: "0.0.0.0",
                  port: 4000,
                  strictPort: true,
                  allowedHosts: true,
                  cors: true,
                  watch: {
                    usePolling: true,
                    interval: 100,
                    awaitWriteFinish: {
                      stabilityThreshold: 150,
                      pollInterval: 50,
                    },
                  },
                },
              };
            },
          } satisfies Plugin,
          consoleForwardPlugin(),
        ]
      : []),
  ];
}
