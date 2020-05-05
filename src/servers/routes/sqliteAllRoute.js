// @flow
import log4js from "log4js";
import express from "express";
import type { Config } from "../../types";
import type { ClassifyType } from "../../types/ClassifyTypes";
import DbService from "../../services/db/DbService";
import ValidationHelper from "../../helpers/ValidationHelper";

const parseParam = (params: {
  q: string,
  type: string
}): { q: string, type: ClassifyType } => {
  return {
    q: params.q,
    type: ValidationHelper.refineClassifyType(params.type)
  };
};

export default function(config: Config): any {
  const router = express.Router();
  const log = log4js.getLogger("sqliteAll");
  const ds = new DbService(config);
  router.get("/", async (req, res, next) => {
    try {
      const param = parseParam(req.query);
      log.info("query = ", param);
      const items = await ds.query(param.q, param.type);

      res.status(200).send(items);
    } catch (e) {
      next(e);
    }
  });
  return router;
}
