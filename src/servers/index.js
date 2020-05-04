// @flow
import type { Logger } from "log4js";
import express from "express";
import DbService from "../services/db/DbService";
import ValidationHelper from "../helpers/ValidationHelper";
import type { Config } from "../types";

export default class Server {
  log: Logger;

  config: Config;

  app: any;

  ds: DbService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.app = express();
    this.ds = new DbService(config);
  }

  init = () => {
    console.log(`auth token: ${ValidationHelper.getAuthToken()}`);
    // this.app.use(log4js.connectLogger(this.log, { level: "auto" }));
    process.on("SIGINT", () => {
      // 終了処理…
      process.exit();
    });
  };

  setupMiddleware = () => {
    // CORS
    this.app.use((req, res, next) => {
      // res.header("Access-Control-Allow-Origin", "*");
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

  parseParam = (params: {
    q: string,
    type: string
  }): { q: string, type: ClassityType } => {
    return {
      q: params.q,
      type: ValidationHelper.refineClassifyType(params.type)
    };
  };

  setupRoute = () => {
    this.app.get("/rpc/sqlite/all", async (req, res, next) => {
      try {
        const param = this.parseParam(req.query);
        this.log.info("query = ", param);
        const items = await this.ds.query(param.q, param.type);

        res.status(200).send(items);
      } catch (e) {
        next(e);
      }
    });
  };

  run = () => {
    this.init();
    this.setupRoute();
    this.setupMiddleware();

    this.app.listen(this.config.serverPort, () => {
      this.log.info("Server is running!");
    });
  };
}
