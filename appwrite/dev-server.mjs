// Dev harness: serves the bundled Appwrite function exactly like Appwrite's
// runtime would, so the all-in-one deployment can be tested locally.
// Usage: node appwrite/dev-server.mjs   (listens on :5050)
import http from "node:http";
import { URL } from "node:url";

const mod = await import("./function/src/main.js");
const fn = mod.default;

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    fn({
      req: { method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams) },
      res: {
        json: (body, status = 200, headers = {}) => {
          res.writeHead(status, headers);
          res.end(typeof body === "string" ? body : JSON.stringify(body));
        },
        text: (body, status = 200, headers = {}) => {
          res.writeHead(status, headers);
          res.end(body);
        },
      },
      error: (m) => console.error(m),
    });
  })
  .listen(5050, () => console.log("appwrite sim on http://127.0.0.1:5050"));
