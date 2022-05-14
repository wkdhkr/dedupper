// @flow
import log4js from "log4js";
import express from "express";
import LockHelper from "../../helpers/LockHelper";
import type { Config } from "../../types";
import ProcessStateDbService from "../../services/db/ProcessStateDbService";
import TagDbService from "../../services/db/TagDbService";

const parseParam = (params: {
  hash: string,
  table: ?string,
  type: string
}): { hash: string, table: string } => {
  return {
    table: params.table || "process_state",
    hash: params.hash
  };
};

const parseBody = (body: any, table: string): any => {
  const stringColumns = ["meta", "trim"];
  const numberColumns = [
    "missing",
    "orientation",
    "view_date",
    "view_count",
    "rating",
    "score",
    "feature",
    "detect"
  ];
  const check = (key: string, type: string): boolean => {
    if (!body) {
      return false;
    }
    if (body[key] === undefined) {
      return true;
    }
    // eslint-disable-next-line valid-typeof
    if (typeof body[key] === type) {
      return true;
    }
    return false;
  };
  const invalidKeys = [];
  stringColumns.some(c => {
    if (!check(c, "string")) {
      invalidKeys.push(c);
      return true;
    }
    return false;
  });
  numberColumns.some(c => {
    if (!check(c, "number")) {
      invalidKeys.push(c);
      return true;
    }
    return false;
  });

  Object.keys(body).forEach(c => {
    if (table === "tag") {
      if (!c.match(/t[0-9]+/)) {
        invalidKeys.push(c);
      }
    } else if (!stringColumns.includes(c) && !numberColumns.includes(c)) {
      invalidKeys.push(c);
    }
  });
  if (invalidKeys.length) {
    const e: any = new Error(
      `invalid post body. key=${JSON.stringify(invalidKeys)}`
    );
    e.statusCode = 400;
    throw e;
  }
  return body;
};

export default function(config: Config): any {
  LockHelper.pollPeriod = 5;
  const router = express.Router();
  const log = log4js.getLogger("sqliteUpdate");
  // const ds = new DbService(config);
  router.post("/", async (req, res, next) => {
    try {
      await LockHelper.lockProcess();
      const param = parseParam(req.query);
      log.info("query = ", param);
      log.info("body = ", JSON.stringify(req.body));
      const isTag = param.table === "tag";
      const psds = new ProcessStateDbService(config);
      await psds.init();
      const row = await psds.queryByHash(param.hash);
      if (!row) {
        res.setHeader("Content-Type", "text/plain");
        res.status(404).send("Not found");
      } else {
        let newRow;
        if (!isTag) {
          newRow = { ...row, ...parseBody(req.body, param.table) };
          await psds.insert(newRow);
        } else {
          const tds = new TagDbService(config);
          await tds.init();
          newRow = await tds.queryByHashOrNew(param.hash);
          newRow = { ...newRow, ...parseBody(req.body, param.table) };
          await tds.insert(newRow);
        }
        res.status(200).send(newRow);
      }
    } catch (e) {
      next(e);
    } finally {
      await LockHelper.unlockProcess();
    }
  });
  return router;
}
