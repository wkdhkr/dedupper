// @flow
import log4js from "log4js";
import fs from "fs-extra";
import path from "path";
import express from "express";
import type { Config } from "../../types";
import { TYPE_IMAGE } from "../../types/ClassifyTypes";
import DbService from "../../services/db/DbService";
import ProcessStateDbService from "../../services/db/ProcessStateDbService";
import ACDService from "../../services/amazon/ACDService";
import ValidationHelper from "../../helpers/ValidationHelper";

const parseParam = (params: {
  hash: string,
  acd?: string
}): { hash: string, acd: boolean } => {
  return {
    acd: Boolean(params.acd),
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
  const streamFlag = false;
  const router = express.Router();
  const log = log4js.getLogger("sqliteAll");
  const ds = new DbService(config);
  const psds = new ProcessStateDbService(config);
  const acds = new ACDService(config);
  // eslint-disable-next-line complexity
  router.get("/", async (req, res, next) => {
    try {
      if (req.header("If-None-Match")) {
        res.status(304).end();
        return;
      }
      const param = parseParam(req.query);
      log.debug("query = ", param);
      const item = await ds.queryByHash(
        ({ hash: param.hash, type: TYPE_IMAGE }: any)
      );
      if (item) {
        let useAcdFlag = false;
        const { acd_id: acdId } = (await psds.queryByHash(param.hash)) || {};
        if (acdId && param.acd) {
          useAcdFlag = true;
        } else {
          useAcdFlag = !(await fs.pathExists(item.to_path));
        }
        const cType =
          mime[
            path
              .extname(item.to_path)
              .slice(1)
              .toLowerCase()
          ] || "application/octet-stream";
        if (useAcdFlag) {
          if (acdId) {
            const ab = await acds.download(acdId);
            res.set("ETag", item.hash);
            res.set("Cache-Control", "max-age=31536000");
            res.status(200).end(Buffer.from(ab), "binary");
          } else {
            res.setHeader("Content-Type", "text/plain");
            res.status(404).end("Not found");
          }
        } else if (streamFlag) {
          const s = fs.createReadStream(item.to_path);
          s.on("open", () => {
            res.set("Content-Type", cType);
            res.set("ETag", item.hash);
            s.pipe(res);
          });
          s.on("error", () => {
            res.setHeader("Content-Type", "text/plain");
            res.status(404).end("Not found");
          });
        } else {
          const img = await fs.readFile(item.to_path);
          res.set("ETag", item.hash);
          res.set("Cache-Control", "max-age=31536000");
          res.status(200).end(img, "binary");
        }
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
