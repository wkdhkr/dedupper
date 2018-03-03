/** @flow */
import path from "path";

import { default as Subject } from "../../../src/services/fs/FileService";
import DateHelper from "../../../src/helpers/DateHelper";
import TestHelper from "../../../src/helpers/TestHelper";

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

  it("createSymLink", async () => {
    const symlink = jest.fn().mockImplementation(() => () => Promise.resolve());
    jest.doMock("fs-extra", () => ({
      pathExists: async () => false,
      symlink
    }));
    const FileService = await loadSubject();
    config.dryrun = false;
    const subject = new FileService(config);

    await subject.createSymLink("a", "b");

    expect(symlink).toBeCalledWith(path.resolve("a"), "b");
  });

  it("createSymLink exists", async () => {
    jest.doMock("fs-extra", () => ({
      pathExists: async () => true
    }));
    const FileService = await loadSubject();
    config.dryrun = false;
    const subject = new FileService(config);

    expect(await subject.createSymLink("a", "b")).toBeUndefined();
  });

  it("createSymLink dryrun", async () => {
    const FileService = await loadSubject();
    config.dryrun = true;
    const subject = new FileService(config);

    expect(await subject.createSymLink("a", "b")).toBeUndefined();
  });

  it("unlink dryrun", async () => {
    const FileService = await loadSubject();
    config.dryrun = true;
    const subject = new FileService(config);

    expect(await subject.unlink("a")).toBeUndefined();
  });

  it("unlink", async () => {
    jest.doMock("fs-extra", () => ({
      pathExists: jest
        .fn()
        .mockImplementationOnce(async () => true)
        .mockImplementationOnce(async () => false),
      unlink: () => Promise.resolve()
    }));
    const FileService = await loadSubject();
    config.dryrun = false;
    const subject = new FileService(config);

    expect(await subject.unlink("a")).toBeUndefined();
  });

  it("createDedupperLock", async () => {
    jest.doMock("touch", () => (_, cb) => cb());
    jest.doMock("winattr", () => ({
      set: (a, b, cb) => cb()
    }));
    const FileService = await loadSubject();
    config.dryrun = false;
    const subject = new FileService(config);

    expect(await subject.createDedupperLock("a")).toBeUndefined();
  });

  it("deleteEmptyDirectory", async () => {
    const deleteEmpty = jest
      .fn()
      .mockImplementation((a, b, cb) => cb(null, ["a", "b"]));
    jest.doMock("delete-empty", () => deleteEmpty);
    const FileService = await loadSubject();
    config.dryrun = false;
    const subject = new FileService(config);

    expect(await subject.deleteEmptyDirectory("a")).toBeUndefined();
    expect(deleteEmpty).toHaveBeenCalledTimes(1);
  });

  it("moveToLibrary", async () => {
    const move = jest.fn().mockImplementation(() => Promise.resolve());
    jest.doMock("fs-extra", () => ({
      pathExists: jest
        .fn()
        .mockImplementationOnce(async () => true)
        .mockImplementationOnce(async () => false),
      lstatSync: () => ({ isDirectory: () => true }),
      stat: () => ({ mtime: new Date(), birthtime: new Date() }),
      move
    }));
    const FileService = await loadSubject();
    config.dryrun = false;
    const subject = new FileService(config);

    expect(
      await subject.moveToLibrary(TestHelper.sampleFile.image.jpg.default)
    ).toContain("_1");
    expect(move).toHaveBeenCalledTimes(1);
  });

  it("moveToLibrary replace", async () => {
    const trash = jest.fn().mockImplementation(() => Promise.resolve());
    const move = jest.fn().mockImplementation(() => Promise.resolve());
    jest.doMock("trash", () => trash);
    jest.doMock("fs-extra", () => ({
      pathExists: jest
        .fn()
        .mockImplementationOnce(async () => true)
        .mockImplementationOnce(async () => true)
        .mockImplementationOnce(async () => false),
      lstatSync: () => ({ isDirectory: () => true }),
      stat: () => ({ isSymbolicLink: () => false }),
      move
    }));
    const FileService = await loadSubject();
    config.dryrun = false;
    const subject = new FileService(config);

    expect(
      await subject.moveToLibrary(TestHelper.sampleFile.image.jpg.default, true)
    ).toBe("__tests__/sample/firefox.jpg");
    expect(trash).toBeCalledWith([TestHelper.sampleFile.image.jpg.default]);
    expect(move).toHaveBeenCalledTimes(1);
  });

  it("prepareDir", async () => {
    jest.doMock("fs-extra", () => ({
      lstatSync: () => ({ isDirectory: () => false })
    }));
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
      pathExists: jest
        .fn()
        .mockImplementationOnce(async () => true)
        .mockImplementationOnce(async () => false)
        .mockImplementationOnce(async () => true)
        .mockImplementationOnce(async () => false)
    };
    jest.doMock("fs-extra", () => fs);

    const FileService = await loadSubject();
    const subject = new FileService(config);
    const src = "/hoge/fuga/foo.txt";

    expect(await subject.delete(src)).toBeUndefined();
    expect(trash).toBeCalledWith([src]);

    expect(await subject.delete()).toBeUndefined();
    expect(trash).toBeCalledWith([subject.getSourcePath()]);
  });

  it("delete symblolicLink", async () => {
    const unlink = jest.fn().mockImplementation(() => Promise.resolve());
    const fs = {
      stat: () =>
        Promise.resolve({
          isSymbolicLink: () => true
        }),
      unlink,
      pathExists: jest
        .fn()
        .mockImplementation(async () => true)
        .mockImplementationOnce(async () => true)
        .mockImplementationOnce(async () => false)
    };
    jest.doMock("fs-extra", () => fs);

    config.dryrun = false;

    const FileService = await loadSubject();
    const subject = new FileService(config);
    const src = "/hoge/fuga/foo.txt";

    await subject.delete(src);
    expect(unlink).toBeCalledWith(src);
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
    expect(move).toBeCalledWith(subject.getSourcePath(), dest);
  });

  it("rename dryrun", async () => {
    const FileService = await loadSubject();
    config.dryrun = true;
    const subject = new FileService(config);
    const src = "/hoge/fuga/foo.txt";
    const dest = src.replace("foo", "bar");
    expect(await subject.rename(src, dest)).toBeUndefined();
  });

  it("collectFileInfo", async () => {
    const subject = new Subject(config);
    DateHelper.currentDate = new Date(2017, 5, 1);
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
      timestamp: (await subject.as.getFileStat()).birthtime.getTime(),
      to_path: "B:\\Image\\2017\\06-01\\__tests__\\sample\\firefox.jpg",
      type: "TYPE_IMAGE",
      width: 500
    });
  });
});
