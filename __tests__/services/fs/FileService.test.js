/** @flow */

import { default as Subject } from "../../../src/services/fs/FileService";
import TestHelper from "../../../src/helpers/TestHelper";
import { TYPE_IMAGE } from "../../../src/types/ClassifyTypes";

describe(Subject.name, () => {
  let config;

  beforeEach(() => {
    jest.resetModules();
    config = TestHelper.createDummyConfig();
    config.path = TestHelper.sampleFile.image.jpg.default;
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
      const mkdirp = jest.fn().mockImplementation((path, cb) => cb());
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
        )
      };
      jest.doMock("fs-extra", () => fs);

      const FileService = await loadSubject();
      const subject = new FileService(config);
      const src = "/hoge/fuga/foo.txt";

      expect(await subject.delete(src)).toBeUndefined();
      expect(trash).toBeCalledWith([src]);
      trash.mockClear();

      expect(await subject.delete()).toBeUndefined();
      expect(trash).toBeCalledWith([config.path]);
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
      expect(move).toBeCalledWith(config.path, dest);
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
      damaged: false,
      from_path: TestHelper.sampleFile.image.jpg.default,
      hash: "dd82c626ec0047df4caf1309b8e4008b072e2627",
      height: 479,
      name: "firefox.jpg",
      p_hash: "7856513260241168089",
      ratio: 500 / 479,
      size: 36189,
      state: "STATE_ACCEPTED",
      timestamp: 1516426623113,
      to_path: "B:\\Image\\2018\\01\\__tests__\\sample\\firefox.jpg",
      type: "TYPE_IMAGE",
      width: 500
    });
  });
});
