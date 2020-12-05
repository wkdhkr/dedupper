// @flow
import typeof { Logger } from "log4js";
import os from "os";
import http from "http";
import https from "https";
import cluster from "express-cluster";
import express from "express";
import { key, crt } from "./dummyHttpsConfig";
import sqliteAllRoute from "./routes/sqliteAllRoute";
import sqliteUpdateRoute from "./routes/sqliteUpdateRoute";
import imageDownloadRoute from "./routes/imageDownloadRoute";
import ValidationHelper from "../helpers/ValidationHelper";
import sqliteChannelCrudRoute from "./routes/sqliteChannelCrudRoute";
import type { Config } from "../types";

export default class Server {
  log: Logger;

  config: Config;

  app: any;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.app = express();
  }

  init = () => {
    console.log(`auth token: ${ValidationHelper.getAuthToken()}`);
    // this.app.use(log4js.connectLogger(this.log, { level: "auto" }));
    process.on("SIGINT", () => {
      process.exit();
    });
  };

  setupMiddleware = () => {
    // json parse
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    // CORS
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      next();
    });

    this.app.use((req, res, next) => {
      if (!ValidationHelper.checkAuthToken(req.query.auth)) {
        res.status(403).send({
          error: "invalid auth token"
        });
      } else {
        next();
      }
    });

    // eslint-disable-next-line no-unused-vars
    this.app.use((err, req, res, next) => {
      if (res.headersSent) {
        next(err);
      } else {
        if (!String(err.statusCode || 0).startsWith("4")) {
          this.log.error(err);
        } else {
          this.log.warn(err);
        }
        res.status(err.statusCode || 500).json({ error: err.message });
      }
    });
  };

  setupRoute = () => {
    this.app.use("/dedupper/v1/rpc/sqlite/all", sqliteAllRoute(this.config));
    this.app.use(
      "/dedupper/v1/rpc/sqlite/update",
      sqliteUpdateRoute(this.config)
    );
    this.app.use(
      "/dedupper/v1/rpc/image/download",
      imageDownloadRoute(this.config)
    );
    this.app.use("/dedupper/v1", sqliteChannelCrudRoute(this.config));
  };

  run = () => {
    this.init();
    this.setupMiddleware();
    this.setupRoute();

    const server = http.createServer(this.app);
    const httpsServer = https.createServer(
      {
        key,
        cert: crt
      },
      this.app
    );
    (httpsServer: any).keepAliveTimeout = 60000 * 2;
    const hosts = ["localhost", os.hostname()];
    cluster(worker => {
      hosts.forEach(host => {
        (httpsServer.listen: any)(this.config.serverHttpsPort, host, () => {
          this.log.info(
            `Server running on https://${host}:${
              httpsServer.address().port
            } with pid ${process.pid} with wid ${worker.id}`
          );
        });
        (server.listen: any)(this.config.serverPort, host, () => {
          this.log.info(
            `Server running on http://${host}:${
              server.address().port
            } with pid ${process.pid} with wid ${worker.id}`
          );
        });
      });
    });
    /*
    server.listen(this.config.serverPort, host, () => {
      this.log.info(
        `Server running on http://${host}:${server.address().port} with pid ${
          process.pid
        }`
      );
    });
    */
  };
}
