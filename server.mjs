import { createServer } from "node:http";
import { readFile, realpath, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = await realpath(path.dirname(fileURLToPath(import.meta.url)));
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT) || 4173;
const dataFile = path.join(root, "case-data.json");
const dataTempFile = `${dataFile}.tmp`;
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".pdf", "application/pdf"],
  [".ico", "image/x-icon"],
]);

const server = createServer(async (request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://localhost:${port}`).pathname);
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Endereço inválido.");
    return;
  }

  if (pathname === "/api/data" || pathname === "/api/importar") {
    if (request.method === "GET") {
      try {
        const data = await readFile(dataFile, "utf8");
        response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        response.end(data);
      } catch (error) {
        if (error?.code === "ENOENT") {
          response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
          response.end(JSON.stringify({ found: false }));
        } else {
          response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Não foi possível ler os dados centralizados.");
        }
      }
      return;
    }
    if (request.method === "PUT" || request.method === "POST") {
      try {
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        if (Buffer.concat(chunks).length > 50 * 1024 * 1024) throw new Error("Arquivo excede o limite de 50 MB.");
        const raw = Buffer.concat(chunks).toString("utf8");
        const payload = JSON.parse(raw);
        let dataToSave = payload;
        if (request.method === "POST") {
          let existing = {};
          try { existing = JSON.parse(await readFile(dataFile, "utf8")); } catch {}
          dataToSave = {
            ...existing,
            ...payload,
            ...(payload.fields || payload.formData ? { formData: payload.fields ?? payload.formData } : {}),
          };
        }
        if (request.method === "PUT") {
          let existing = {};
          try { existing = JSON.parse(await readFile(dataFile, "utf8")); } catch {}
          if (existing.formData && !dataToSave.formData) dataToSave = { ...dataToSave, formData: existing.formData };
        }
        await writeFile(dataTempFile, JSON.stringify(dataToSave, null, 2), "utf8");
        await rename(dataTempFile, dataFile);
        response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ saved: true }));
      } catch (error) {
        console.error("Erro ao salvar dados centralizados:", error);
        response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ saved: false, error: error.message }));
      }
      return;
    }
    response.writeHead(405, { Allow: "GET, PUT, POST", "Content-Type": "text/plain; charset=utf-8" });
    response.end("Método não permitido.");
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
    response.end("Método não permitido.");
    return;
  }

  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${host}:${port}`).pathname);
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Endereço inválido.");
    return;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const target = path.resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Acesso negado.");
    return;
  }

  try {
    const data = await readFile(target);
    const contentType = types.get(path.extname(target).toLowerCase()) ?? "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": "no-store",
    });
    response.end(request.method === "HEAD" ? undefined : data);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "EISDIR") {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Arquivo não encontrado.");
      return;
    }
    console.error("Erro ao servir arquivo:", error);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Erro interno do servidor.");
  }
});

server.listen(port, host, () => {
  console.log(`Case Viver disponível em http://localhost:${port}`);
  console.log("Para outros computadores da mesma rede, acesse usando o IP deste computador, por exemplo http://192.168.0.10:4173");
  console.log("Os dados são compartilhados no arquivo case-data.json desta pasta.");
});
