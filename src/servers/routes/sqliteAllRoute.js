// @flow
/* eslint-disable no-underscore-dangle, no-param-reassign */
import pLimit from "p-limit";
import log4js from "log4js";
import fs from "fs-extra";
import express from "express";
import type { Config } from "../../types";
import type { ClassifyType } from "../../types/ClassifyTypes";
import DbService from "../../services/db/DbService";
import TagDbService from "../../services/db/TagDbService";
import ProcessStateDbService from "../../services/db/ProcessStateDbService";
import ValidationHelper from "../../helpers/ValidationHelper";

const parseParam = (params: {
  q: string,
  data?: string,
  type: string,
  ff?: string
}): { ff: boolean, q: string, data: string[], type: ClassifyType } => {
  return {
    q: params.q,
    data: params.data ? params.data.split(",") : [],
    type: ValidationHelper.refineClassifyType(params.type),
    ff: Boolean(params.ff)
  };
};

const limit = pLimit(1);

const updateDb = async (item: any, psds: ProcessStateDbService) => {
  if (!item.hash) {
    return;
  }
  if (item.missing === 0 && item._isNotExists) {
    // invalid missing state, update
    const row = await psds.queryByHash(item.hash);
    if (!row) {
      return;
    }
    const newRow = { ...row, missing: 2 };
    await psds.insert(newRow);
  }
};

export default function(config: Config): any {
  const router = express.Router();
  const log = log4js.getLogger("sqliteAll");
  const ds = new DbService(config);
  const tds = new TagDbService(config);
  const psds = new ProcessStateDbService(config);
  psds.init();
  tds.init();

  const fillField = async (items: { hash: string }[], param: any) => {
    if (items.length && param.type === "TYPE_IMAGE") {
      const hashs = items.map(i => i.hash);
      let columns = [
        "distinct hash.hash",
        "hash.size",
        "hash.width",
        "hash.height",
        "hash.to_path",
        "hash.timestamp",
        "process_state.acd_id",
        "process_state.trim",
        "process_state.rating",
        "process_state.missing",
        "process_state.view_date",
        "process_state.view_count",
        "tag.t1",
        "tag.t2",
        "tag.t3",
        "tag.t4",
        "tag.t5",
        "tag.t6",
        "tag.t7",
        "tag.t8",
        "tag.t9",
        "tag.t10",
        "tag.t11",
        "nsfw_js.neutral",
        "nsfw_js.drawing",
        "nsfw_js.hentai",
        "nsfw_js.hentai_porn",
        "nsfw_js.hentai_porn_sexy",
        "nsfw_js.hentai_sexy",
        "nsfw_js.neutral",
        "nsfw_js.porn",
        "nsfw_js.porn_sexy",
        "nsfw_js.sexy"
      ].join(",");
      // const sort = "random()";
      if (items.length === 1) {
        columns += ",p_hash";
      }
      items = await ds.query(
        `SELECT ${columns} from hash ` +
          "INNER JOIN process_state ON hash.hash = process_state.hash " +
          "INNER JOIN nsfw_js ON hash.hash = nsfw_js.hash " +
          "LEFT OUTER JOIN tag ON hash.hash = tag.hash " +
          `where hash.hash in (${hashs.map(h => `"${h}"`).join(",")}) `, // +
        // `ORDER BY ${sort}`
        param.type
      );
      return items;
    }
    return (items: any);
  };
  router.post("/", async (req, res, next) => {
    try {
      // console.log(req.body.type);
      const param = parseParam(req.body);
      log.info("query = ", {
        ...param,
        q: "[post]"
      });
      let items = await ds.query(param.q, param.type);
      items = param.ff ? await fillField(items, param) : items;
      const checkedItems = await Promise.all(
        items.map(async item => {
          if (item.to_path) {
            item._isNotExists = !(await fs.pathExists(item.to_path));
            setTimeout(() => limit(() => updateDb(item, psds)), 1000);
          }
          return item;
        })
      );

      // eslint-disable-next-line no-underscore-dangle
      res.status(200).send(checkedItems.filter(item => !item._isNotExists));
    } catch (e) {
      next(e);
    }
  });
  router.get("/", async (req, res, next) => {
    try {
      const param = parseParam(req.query);
      log.debug("query = ", param);
      let items = await ds.query(param.q, param.type);
      items = param.ff ? await fillField(items, param) : items;
      const checkedItems = await Promise.all(
        items.map(async item => {
          if (item.to_path) {
            item._isNotExists = !(await fs.pathExists(item.to_path));
            setTimeout(() => limit(() => updateDb(item, psds)), 1000);
          }
          return item;
        })
      );

      // eslint-disable-next-line no-underscore-dangle
      res.status(200).send(checkedItems.filter(item => !item._isNotExists));
    } catch (e) {
      next(e);
    }
  });
  return router;
}
