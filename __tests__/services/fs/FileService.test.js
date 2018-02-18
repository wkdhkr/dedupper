/** @flow */
import path from "path";

import { default as Subject } from "../../../src/services/fs/FileService";
import TestHelper from "../../../src/helpers/TestHelper";
import { TYPE_IMAGE } from "../../../src/types/ClassifyTypes";

jest.setTimeout(15000);
describe(Subject.name, () => {
  let config;

  beforeEach(() => {
    jest.resetModules();
    config = TestHelper.createDummyConfig();
    config.path = TestHelper.sampleFile.image.jpg.default;
    config.cache = false;
  });

  const loadSubject = async () =>
    (await import("../../../src/services/fs/FileService")).default;

  describe("fs operation", () => {
    it("moveToLibrary", async () => {
      const FileService = await loadSubject();
      config.dryrun = true;
      const subject = new FileService(config);

      expect(await subject.moveToLibrary()).toContain(
        config.baseLibraryPathByType[TYPE_IMAGE]
      );
      expect(
        await subject.moveToLibrary(TestHelper.sampleFile.image.jpg.default)
      ).toContain("_1");
    });

    it("prepareDir", async () => {
      const mkdirp = jest.fn().mockImplementation((_, cb) => cb());
      jest.doMock("mkdirp", () => mkdirp);

      const FileService = await loadSubject();
      const subject = new FileService(config);
      const dir = "./hoge/fuga";

      expect(await subject.prepareDir(dir, true)).toBeUndefined();
      expect(mkdirp).toBeCalledWith(dir, expect.any(Function));
    });

    it("prepareDir dryrun", async () => {
      const FileService = await loadSubject();
      config.dryrun = true;
      const subject = new FileService(config);
      const dir = "./hoge/fuga";

      expect(await subject.prepareDir(dir)).toBeUndefined();
    });

    it("delete", async () => {
      const trash = jest.fn().mockImplementation(() => Promise.resolve());
      jest.doMock("trash", () => trash);
      const fs = {
        stat: jest.fn().mockImplementation(() =>
          Promise.resolve({
            isSymbolicLink: () => false
          })
        ),
        pathExistsSync: () => false
      };
      jest.doMock("fs-extra", () => fs);

      const FileService = await loadSubject();
      const subject = new FileService(config);
      const src = "/hoge/fuga/foo.txt";

      expect(await subject.delete(src)).toBeUndefined();
      expect(trash).toBeCalledWith([src]);
      trash.mockClear();

      expect(await subject.delete()).toBeUndefined();
      expect(trash).toBeCalledWith([path.resolve(config.path)]);
    });

    it("delete dryrun", async () => {
      const FileService = await loadSubject();
      config.dryrun = true;
      const subject = new FileService(config);
      const src = "/hoge/fuga/foo.txt";
      expect(await subject.delete(src)).toBeUndefined();
    });

    it("rename", async () => {
      const move = jest.fn().mockImplementation(() => Promise.resolve());
      jest.doMock("fs-extra", () => ({
        move,
        access() {},
        stat() {}
      }));

      const FileService = await loadSubject();
      const subject = new FileService(config);
      const src = "/hoge/fuga/foo.txt";
      const dest = src.replace("foo", "bar");

      expect(await subject.rename(src, dest)).toBeUndefined();
      expect(move).toBeCalledWith(src, dest);
      move.mockClear();

      expect(await subject.rename(dest)).toBeUndefined();
      expect(move).toBeCalledWith(path.resolve(config.path), dest);
    });

    it("rename dryrun", async () => {
      const FileService = await loadSubject();
      config.dryrun = true;
      const subject = new FileService(config);
      const src = "/hoge/fuga/foo.txt";
      const dest = src.replace("foo", "bar");
      expect(await subject.rename(src, dest)).toBeUndefined();
    });
  });

  it("collectFileInfo", async () => {
    const subject = new Subject(config);
    expect(await subject.collectFileInfo()).toEqual({
      d_hash: 3698360429560414000,
      from_path: path.resolve("__tests__/sample/firefox.jpg"),
      hash: "f7680c47177100866759ac2029edc15bfd092d923f858547a5234c2ddbced40b",
      height: 479,
      damaged: false,
      name: "firefox.jpg",
      p_hash: "7856513260241168089",
      ratio: 1.0438413361169103,
      size: 36189,
      state: "STATE_ACCEPTED",
      timestamp: 1516426623113,
      to_path: "B:\\Image\\2018\\01\\__tests__\\sample\\firefox.jpg",
      type: "TYPE_IMAGE",
      width: 500
    });
  });
});
