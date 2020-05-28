// @flow
/* eslint-disable no-underscore-dangle, no-param-reassign */
// import log4js from "log4js";
import express from "express";
import type { Config } from "../../types";
import ValidationHelper from "../../helpers/ValidationHelper";
import ChannelDbService from "../../services/db/ChannelDbService";

export default function(config: Config): any {
  const router = express.Router();
  // const log = log4js.getLogger("sqliteChannelCrud");
  const cds = new ChannelDbService(config);
  cds.init();

  router.get("/channels", async (req, res) => {
    const channels = await cds.all();

    res.status(200).send(channels);
  });

  router.get("/channel/:id", async (req, res) => {
    const hit = await cds.queryById(
      ValidationHelper.refineChannelId(req.params.id)
    );
    if (hit) {
      res.status(200).send(hit);
    } else {
      res.status(404).send("404 Not Found");
    }
  });

  router.delete("/channel/:id", async (req, res) => {
    const hit = await cds.queryById(
      ValidationHelper.refineChannelId(req.params.id)
    );
    if (hit) {
      await cds.deleteById(ValidationHelper.refineChannelId(req.params.id));
      res.status(200).send("200 Ok");
    } else {
      res.status(404).send("404 Not Found");
    }
  });
  router.put("/channel/:id", async (req, res) => {
    await cds.insert({
      id: ValidationHelper.refineChannelId(req.params.id),
      ...req.body
    });
    res.status(200).send("200 Ok");
  });
  router.post("/channels", async (req, res) => {
    const id = await cds.insert(req.body);
    const newRow = await cds.queryById(id);
    if (newRow) {
      res.status(201).send(newRow);
    } else {
      res.status(500).send("500 Internal Server Error");
    }
  });
  router.get("/channel/:id", async (req, res) => {
    const channel = await cds.queryById(
      ValidationHelper.refineChannelId(req.params.id)
    );
    if (channel) {
      res.status(200).send(channel);
    } else {
      res.status(404).send("404 Not Found");
    }
  });
  return router;
}
