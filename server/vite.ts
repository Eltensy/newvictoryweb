import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Исправленный путь к директории сборки
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  
  console.log(`Looking for build directory at: ${distPath}`);
  
  if (!fs.existsSync(distPath)) {
    // Попробуем альтернативные пути
    const alternativePaths = [
      path.resolve(import.meta.dirname, "public"),
      path.resolve(import.meta.dirname, "..", "public"),
      path.resolve(process.cwd(), "dist", "public"),
      path.resolve(process.cwd(), "public"),
    ];
    
    console.log("Checking alternative paths:");
    for (const altPath of alternativePaths) {
      console.log(`- ${altPath}: ${fs.existsSync(altPath) ? "EXISTS" : "NOT FOUND"}`);
      if (fs.existsSync(altPath)) {
        console.log(`Using alternative path: ${altPath}`);
        app.use(express.static(altPath));
        
        // fall through to index.html if the file doesn't exist
        app.use("*", (_req, res) => {
          res.sendFile(path.resolve(altPath, "index.html"));
        });
        return;
      }
    }
    
    throw new Error(
      `Could not find the build directory. Tried:\n${[distPath, ...alternativePaths].map(p => `- ${p}`).join('\n')}\n\nMake sure to build the client first with 'npm run build'`,
    );
  }

  console.log(`Serving static files from: ${distPath}`);
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}