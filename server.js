const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const initialPort = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function getContentType(filePath) {
  return mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function isSafePath(candidatePath) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedCandidate = path.resolve(candidatePath);
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`);
}

function resolveFilePath(requestPath) {
  const decodedPath = decodeURIComponent(requestPath || "/");
  const normalizedPath = decodedPath.replace(/^\/+/, "");
  const basePath = normalizedPath === "" ? "index.html" : normalizedPath;

  const candidates = [];
  if (basePath === "index.html" && decodedPath === "/") {
    candidates.push("index.html");
  } else {
    if (basePath.endsWith("/")) {
      candidates.push(`${basePath}index.html`);
    }
    candidates.push(basePath);
    if (!path.extname(basePath)) {
      candidates.push(`${basePath}.html`);
    }
  }

  const rootRelativeCandidates = candidates.map((candidate) => path.resolve(rootDir, candidate));

  for (const candidate of rootRelativeCandidates) {
    if (!isSafePath(candidate)) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function sendFile(res, filePath) {
  const content = fs.readFileSync(filePath);
  res.writeHead(200, {
    "Content-Type": getContentType(filePath),
    "Cache-Control": "no-cache"
  });
  res.end(content);
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const filePath = resolveFilePath(requestUrl.pathname);

  if (filePath) {
    sendFile(res, filePath);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 - Página no encontrada");
});

function startServer(port) {
  server.listen(port, () => {
    console.log(`Servidor listo en http://localhost:${port}`);
  });
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    const nextPort = initialPort + 1;
    if (nextPort < initialPort + 10) {
      console.log(`Puerto ${initialPort} ocupado, intentando ${nextPort}...`);
      server.close(() => startServer(nextPort));
      return;
    }
  }

  throw error;
});

startServer(initialPort);
