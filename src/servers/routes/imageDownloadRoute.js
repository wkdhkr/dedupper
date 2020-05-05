// @flow
import log4js from "log4js";
import fs from "fs";
import path from "path";
import express from "express";
import type { Config } from "../../types";
import { TYPE_IMAGE } from "../../types/ClassifyTypes";
import DbService from "../../services/db/DbService";
import ValidationHelper from "../../helpers/ValidationHelper";

const parseParam = (params: { hash: string }): { hash: string } => {
  return {
    hash: ValidationHelper.refineHash(params.hash)
  };
};

const mime = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif"
};

export default function(config: Config): any {
  const router = express.Router();
  const log = log4js.getLogger("sqliteAll");
  const ds = new DbService(config);
  router.get("/", async (req, res, next) => {
    try {
      const param = parseParam(req.query);
      log.info("query = ", param);
      const item = await ds.queryByHash(
        ({ hash: param.hash, type: TYPE_IMAGE }: any)
      );
      if (item) {
        const cType =
          mime[
            path
              .extname(item.to_path)
              .slice(1)
              .toLowerCase()
          ] || "application/octet-stream";
        const s = fs.createReadStream(item.to_path);
        s.on("open", () => {
          res.set("Content-Type", cType);
          s.pipe(res);
        });
        s.on("error", () => {
          res.setHeader("Content-Type", "text/plain");
          res.status(404).end("Not found");
        });
      } else {
        res.setHeader("Content-Type", "text/plain");
        res.status(404).end("Not found");
      }
    } catch (e) {
      next(e);
    }
  });
  return router;
}