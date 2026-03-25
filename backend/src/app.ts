import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Logging
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Root route (fixes "Cannot GET /")
app.get("/", (req, res) => {
  res.status(200).send("API is running");
});

// ✅ Health check (for Render / uptime checks)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// API routes
app.use("/api", router);

// Optional: 404 handler (clean API response)
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// Optional: global error handler
app.use((err: any, req: any, res: any, next: any) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    error: "Internal Server Error",
  });
});

export default app;