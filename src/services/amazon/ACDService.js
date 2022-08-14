// @flow
// import sleep from "await-sleep";
import pLimit from "p-limit";
import { wrapper } from "axios-cookiejar-support";
import FormData from "form-data";
import { CookieJar } from "tough-cookie";
import concat from "concat-stream";
import Axios from "axios";
import axiosRetry from "axios-retry";
// import got from "got";
import fs from "fs-extra";
import { createReadStream } from "fs";
import path from "path";
import mkdirp from "mkdirp";
import pify from "pify";
import puppeteer from "puppeteer";
import typeof { Logger } from "log4js";
import LockHelper from "../../helpers/LockHelper";
import type { Config } from "../../types";

axiosRetry(Axios, { retries: 100, retryDelay: axiosRetry.exponentialDelay });
wrapper(Axios);

const axios = Axios.create({
  jar: new CookieJar(),
  withCredentials: true,
  maxContentLength: Infinity,
  maxBodyLength: Infinity
});

const mkdirAsync: string => Promise<void> = pify(mkdirp);

const escapeForQuery = (str: string) => {
  let escapedStr = str;
  [
    " ",
    "+",
    "-",
    "&",
    "|",
    "!",
    "(",
    ")",
    "{",
    "}",
    "[",
    "]",
    "^",
    "'",
    '"',
    "~",
    "*",
    "?",
    ":"
  ].forEach(token => {
    const replace = token.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
    const re = new RegExp(replace, "g");
    escapedStr = escapedStr.replace(re, `\\${token}`);
  });
  return escapedStr;
};
const limitForAccessToken = pLimit(1);
const limitForAuth = pLimit(1);
const limitForAppConfig = pLimit(1);
const limitForPrepareFolder = pLimit(1);

export default class ACDService {
  lock: (name: string) => any = (name: string) => LockHelper.lockProcess(name);

  unlock: (name: string) => Promise<void> = (name: string) =>
    LockHelper.unlockProcess(name);

  usePreviousCookie: boolean = true;

  log: Logger;

  config: Config;

  appConfig: any;

  cookies: any[] = [];

  cookieFilePath: string;

  configFilePath: string;

  tokenFilePath: string;

  accessTokenInfo: any = {};

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.cookieFilePath = path.join(
      this.config.amazonBaseDir,
      "amazonCookies.json"
    );
    this.configFilePath = path.join(
      this.config.amazonBaseDir,
      "amazonConfig.json"
    );
    this.tokenFilePath = path.join(
      this.config.amazonBaseDir,
      "amazonToken.json"
    );
  }

  /*
  createLabels = async (fileInfo: FileInfo) => {
    const labels = [];
    const labelPrefix = "_dp_";
    // max 10 label
    // 1~5. tag
    labels.push(`${labelPrefix}t1_${fileInfo.hash}`);
    labels.push(`${labelPrefix}t2_${fileInfo.hash}`);
    labels.push(`${labelPrefix}t3_${fileInfo.hash}`);
    labels.push(`${labelPrefix}t4_${fileInfo.hash}`);
    labels.push(`${labelPrefix}t5_${fileInfo.hash}`);
    // 6. file hash
    labels.push(`${labelPrefix}hash_${fileInfo.hash}`);
  };
  */

  createCredentialHeaders: () => {
    Cookie: string,
    "x-amzn-sessionid": any
  } = () => {
    const { sessionData } = this.appConfig || {};
    const { sessionId } = sessionData || {};
    return {
      Cookie: this.cookies
        .map(({ name, value }) => `${name}=${value}`)
        .join(";"),
      "x-amzn-sessionid": sessionId
    };
  };

  prepareAccessToken: () => Promise<empty> = async () => {
    return limitForAccessToken(async () => {
      if (this.accessTokenInfo.expire) {
        if (Date.now() < this.accessTokenInfo.expire) {
          return;
        }
      }
      const host = this.config.amazonDriveApiUrl
        .replace(/http.:\/\//, "")
        .replace(/\/.*/, "");
      const { data } = await axios.get(
        `https://${host}/clouddrive/auth/token?mgh=1&_=${new Date().getTime()}`,
        {
          headers: this.createCredentialHeaders()
        }
      );
      this.accessTokenInfo = {
        ...data,
        expire: Date.now() + 1e3 * (data.duration - 600)
      };
      await fs.writeFile(
        this.tokenFilePath,
        JSON.stringify(this.accessTokenInfo)
      );
    });
  };

  auth: (isRetry?: boolean) => Promise<true | void> = async (
    isRetry: boolean = false
  ) => {
    const fn = async (isRetryNested: boolean) => {
      try {
        if (isRetryNested) {
          this.log.debug(`retry auth`);
          await this.refreshAppConfig();
        }
        await axios.get(
          `${this.config.amazonDriveApiUrl}nodes?filters=isRoot:true`,
          {
            headers: this.createCredentialHeaders()
          }
        );
        this.log.debug(`auth ok`);
        return true;
      } catch (e) {
        if (isRetry) {
          throw e;
        }
        this.log.debug(e);
        this.log.warn("request failed. refresh app config...");
        return this.auth(true);
      }
    };
    if (isRetry) {
      return fn(true);
    }
    return limitForAuth(fn);
  };

  post: (urlPath: string, form: any) => Promise<any> = async (
    urlPath: string,
    form: any
  ) => {
    await this.auth();
    await this.prepareAccessToken();
    return new Promise((resolve, reject) => {
      form.pipe(
        concat({ encoding: "buffer" }, async data => {
          try {
            const res = await axios.post(
              `${this.appConfig.endpoints.cloudDriveProxyEndpoint}${urlPath}`,
              data,
              {
                headers: {
                  authorization: `Bearer ${this.accessTokenInfo.access_token}`,
                  ...this.createCredentialHeaders(),
                  ...form.getHeaders()
                }
              }
            );
            resolve(res);
          } catch (e) {
            reject(e);
          }
        })
      );
    });
    /*
    const { data: res } = await axios.post(
      `${this.config.amazonDriveApiUrl}${urlPath}`,
      form,
      {
        headers: {
          ...this.createCredentialHeaders(),
          ...form.getHeaders()
        }
      }
    );
    return res;
    */
    /*
    return got.post(`${this.config.amazonDriveApiUrl}${urlPath}`, {
      body: form,
      headers: this.createCredentialHeaders()
    });
    */
  };

  upload: (
    filePath: string,
    parentId: string,
    labels?: Array<string>,
    name?: null | string
  ) => Promise<empty> = async (
    filePath: string,
    parentId: string,
    labels: string[] = [],
    name: string | null = null
  ) => {
    const form = new FormData();
    const fileName = name || path.basename(filePath);
    // form.append("content", createReadStream(filePath), fileName);
    // form.append("content", fs.readFileSync(filePath), fileName);
    // form.append("file", fs.readFileSync(filePath));
    const metadata = JSON.stringify({
      name: fileName,
      labels,
      kind: "FILE",
      parents: [parentId]
    });
    form.append("metadata", metadata);
    form.append("file", createReadStream(filePath), fileName);

    const res = await this.post("nodes?suppress=deduplication", form);
    return res.data;
  };

  override: (filePath: string, fileId: string) => Promise<any> = async (
    filePath: string,
    fileId: string
  ) => {
    const form = new FormData();
    const fileName = path.basename(filePath);
    // form.append("content", createReadStream(filePath), fileName);
    // form.append("content", fs.readFileSync(filePath), fileName);
    // form.append("file", fs.readFileSync(filePath));
    form.append("file", createReadStream(filePath), fileName);
    const res = await this.putFile(`nodes/${fileId}/content`, form);
    return res.data;
  };

  trash: (id: string) => Promise<empty> = async (id: string) => {
    const res = await this.put(`trash/${id}`, {
      recurse: "true",
      resourceVersion: "V2",
      ContentType: "JSON"
    });
    return res;
  };

  putFile: (urlPath: string, form: any) => Promise<any> = async (
    urlPath: string,
    form: any
  ) => {
    await this.auth();
    await this.prepareAccessToken();
    return new Promise((resolve, reject) => {
      form.pipe(
        concat({ encoding: "buffer" }, async data => {
          try {
            const res = await axios.put(
              `${this.appConfig.endpoints.cloudDriveProxyEndpoint}${urlPath}`,
              data,
              {
                headers: {
                  authorization: `Bearer ${this.accessTokenInfo.access_token}`,
                  ...this.createCredentialHeaders(),
                  ...form.getHeaders()
                }
              }
            );
            resolve(res);
          } catch (e) {
            reject(e);
          }
        })
      );
    });
  };

  put: (urlPath: string, data: any) => Promise<Promise<empty>> = async (
    urlPath: string,
    data: any
  ) => {
    await this.auth();
    // await this.prepareAccessToken();
    const res = await axios.put(
      `${this.config.amazonDriveApiUrl}${urlPath}`,
      data,
      {
        headers: this.createCredentialHeaders()
      }
    );
    return res.data;
  };

  patch: (params: any) => Promise<empty> = async (params: any) => {
    const urlPath = "nodes";
    await this.auth();
    const { data } = await axios.patch(
      `${this.config.amazonDriveApiUrl}${urlPath}`,
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(this.createCredentialHeaders(): any)
        }
      }
    );
    return data;
  };

  get: (urlPath: string, params: any) => Promise<any> = async (
    urlPath: string,
    params: any
  ) => {
    await this.auth();
    const { data } = await axios.get(
      `${this.config.amazonDriveApiUrl}${urlPath}`,
      {
        params,
        headers: this.createCredentialHeaders()
      }
    );
    return data;
  };

  getOne: (
    urlPath: string,
    params: any
  ) => Promise<any | Promise<any>> = async (urlPath: string, params: any) => {
    const { data } = await this.get(urlPath, params);
    return data[0] || null;
  };

  download: (id: string) => Promise<any> = async (id: string) => {
    const urlPath = `nodes/${id}/content`;
    await this.auth();
    const { data } = await axios.get(
      `${this.appConfig.endpoints.cloudDriveProxyEndpoint}${urlPath}`,
      // `${this.config.amazonDriveApiUrl}${urlPath}`,
      {
        params: {},
        responseType: "arraybuffer",
        headers: this.createCredentialHeaders()
      }
    );
    return data;
  };

  /*
  downloadWithShared: (id: string) => Promise < any > = async (id: string) => {


  };
  */

  createFolder: (
    name: string,
    parentId: string
  ) => Promise<{ id: any, ... }> = async (name: string, parentId: string) => {
    try {
      const { data } = await axios.post(
        `${this.config.amazonDriveApiUrl}nodes`,
        {
          kind: "FOLDER",
          name,
          parents: [parentId],
          resourceVersion: "V2",
          ContentType: "JSON"
        },
        {
          headers: this.createCredentialHeaders()
        }
      );
      return data;
    } catch (e) {
      if (e.response && e.response.status === 409) {
        const { nodeId } = (e.response && e.response.data.info) || {};
        return { id: nodeId };
      }
      const res = await this.listSingleFolder(parentId, name);
      if (res.length) {
        if (res[0].name !== name) {
          this.log.error(`detect invalid folder name. name = ${res[0].name}`);
          throw e;
        }
        return res[0];
      }
      throw e;
    }
  };

  convertLocalPath: (localFolderPath: string) => string = (
    localFolderPath: string
  ) => {
    return (
      this.config.amazonDriveBaseDir +
      localFolderPath.replace(/[a-zA-Z]:(\/|\\)/, "/").replace(/\\/g, "/")
    );
  };

  listSingleFolder: (
    folderId: string,
    folderName: string
  ) => Promise<any> = async (folderId: string, folderName: string) => {
    const escapedDir = escapeForQuery(folderName);
    const filters = `kind:FOLDER AND name:(${escapedDir})`;
    this.log.debug(`list query. filters = ${filters}`);
    const res = await this.listChildren(folderId, filters);
    return res;
  };

  listSingleFile: (
    folderId: string,
    folderName: string
  ) => Promise<empty> = async (folderId: string, folderName: string) => {
    const escapedName = escapeForQuery(folderName);
    const filters = `kind:FILE AND name:(${escapedName})`;
    const res = await this.listChildren(folderId, filters);
    return res;
  };

  prepareFolderPath: (folderPath: string) => Promise<empty> = async (
    folderPath: string
  ) => {
    await this.lock("acd_folder");
    try {
      const result = await limitForPrepareFolder(async () => {
        const directories = folderPath.replace(/(^\/|\/$)/g, "").split("/");
        const fullPathDirectories = directories.map((d, i) => [
          Array.from(Array(i + 1).keys()).map(j => directories[j]),
          d
        ]);
        const rootId = (await this.getRoot()).id;
        let currentFolderId = rootId;

        for (const dirArray of fullPathDirectories) {
          const [fullPathDirs, dir] = dirArray;
          const fullPath = fullPathDirs.join("/");
          const cachedFolderId = this.queryFolderIdByPath(fullPath);
          if (cachedFolderId) {
            currentFolderId = cachedFolderId;
          } else {
            // eslint-disable-next-line no-await-in-loop
            const res = await this.listSingleFolder(currentFolderId, dir);
            if (res.length) {
              if (res[0].name !== dir) {
                throw new Error(
                  `invalid file name. path=${folderPath}, id=${res[0].id}`
                );
              }
              currentFolderId = res[0].id;
            } else {
              // eslint-disable-next-line no-await-in-loop
              const { id } = await this.createFolder(dir, currentFolderId);
              currentFolderId = id;
            }
          }
          this.saveFolderId(currentFolderId, fullPath);
        }
        return currentFolderId;
      });
      return result;
    } catch (e) {
      this.log.error(`prepareFolder error. path = ${folderPath}`);
      throw e;
    } finally {
      await this.unlock("acd_folder");
    }
  };

  queryFolderIdByPath: (fullPath: string) => any | null = (
    fullPath: string
  ) => {
    if (this.folderLookup[fullPath]) {
      return this.folderLookup[fullPath];
    }
    return null;
  };

  folderLookup: { string: string } = {};

  saveFolderId: (folderId: string, fullPath: string) => void = (
    folderId: string,
    fullPath: string
  ) => {
    this.folderLookup[fullPath] = folderId;
  };

  listChildren: (id: string, filters: string) => Promise<any> = async (
    id: string,
    filters: string
  ) => {
    const res = await this.get(`nodes/${id}/children`, {
      filters
    });
    return res.data;
  };

  getRoot: () => Promise<any> = async () => {
    const node = await this.getOne("nodes", {
      filters: "isRoot:true"
    });
    return node;
  };

  demo: () => Promise<null> = async () => {
    try {
      // const node = await this.getRoot();
      // const parentId = node.id;
      // const labels = ["test1", "test2"];
      /*
      const data = await this.upload(
        path.resolve("./__tests__/sample/firefox.jpg"),
        parentId,
        labels
      );
      await sleep(1000 * 5);
      */
      const res = await this.override(
        path.resolve("./__tests__/sample/firefox.jpg"),
        "ZVlcnVtsR9GRHfMPDi2FCQ"
        // data.id
      );
      console.log(res);
      return null;
      // const res = await this.trash(data.id);
      // return res;
      /*
      const id = await this.prepareFolderPath("test/hoge/fuga");
      // const res = await this.trash(id);
      console.log(id);
      return null;
      */
      // return res;
    } catch (e) {
      console.log(e);
      return null;
    }
  };

  init: () => Promise<void> = async () => {
    this.cookies = [];
    this.appConfig = {};
    this.accessTokenInfo = {};
    if (this.usePreviousCookie) {
      try {
        this.cookies = JSON.parse(
          await fs.readFile(this.cookieFilePath, "utf-8")
        );
      } catch (e) {
        // avoid
      }
    }
    try {
      this.appConfig = JSON.parse(
        await fs.readFile(this.configFilePath, "utf-8")
      );
    } catch (e) {
      // avoid
    }
    try {
      this.accessTokenInfo = JSON.parse(
        await fs.readFile(this.tokenFilePath, "utf-8")
      );
    } catch (e) {
      // avoid
    }
  };

  refreshAppConfig: () => Promise<empty> = async () => {
    return limitForAppConfig(async () => {
      await mkdirAsync(this.config.amazonBaseDir);

      const browser = await puppeteer.launch({
        args: ["--no-sandbox"],
        // headless: true
        headless: false
      });
      const page = await browser.newPage();
      for (const cookie of this.cookies) {
        // eslint-disable-next-line no-await-in-loop
        await page.setCookie(cookie);
      }
      await page.goto(this.config.amazonLoginUrl);
      if (page.url().includes("signin")) {
        try {
          await page.type("#ap_email", this.config.amazonUser);
        } catch (e) {
          // may be filled form
        }
        await page.type("#ap_password", this.config.amazonPassword);
        await page.click("#signInSubmit");
      }
      await page.waitForSelector("#files-app");
      const loginCookies = await page.cookies();
      this.cookies = loginCookies;
      await fs.writeFile(this.cookieFilePath, JSON.stringify(loginCookies));
      // eslint-disable-next-line no-undef
      const appConfig = await page.evaluate(() => window.AppConfig);
      this.appConfig = appConfig;
      await fs.writeFile(
        this.configFilePath,
        JSON.stringify(appConfig, null, 4)
      );
      browser.close();
    });
  };
}
