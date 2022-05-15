/** @flow */
import path from "path";

import { default as Subject } from "../../../src/services/fs/FileService";
import TestHelper from "../../../src/helpers/TestHelper";
import { STATE_ACCEPTED } from "../../../src/types/FileStates";
import { TYPE_IMAGE } from "../../../src/types/ClassifyTypes";

process.setMaxListeners(0);
jest.setTimeout(15000);
describe(Subject.name, () => {
  let config;

  beforeEach(() => {
    jest.resetModules();
    config = TestHelper.createDummyConfig();
    config.path = TestHelper.sampleFile.image.jpg.default;
    config.cache = false;
    jest.doMock("wait-on", () => (opt, cb) => cb());
    jest.doMock(
      "../../../src/services/fs/contents/PHashService",
      () => class C {}
    );
  });

  const loadSubject = async () =>
    (await import("../../../src/services/fs/FileService")).default;

  it("createSymLink", async () => {
    const symlink = jest.fn().mockImplementation(() => () => Promise.resolve());
    jest.doMock("fs-extra", () => ({
      copyFile: async () => {},
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
      copyFile: async () => {},
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
      copyFile: async () => {},
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
    const mv = jest.fn().mockImplementation((f, d, cb) => cb());
    jest.doMock("mv", () => mv);
    jest.doMock("fs-extra", () => ({
      copyFile: async () => {},
      pathExists: jest
        .fn()
        .mockImplementationOnce(async () => true)
        .mockImplementationOnce(async () => false),
      lstatSync: () => ({ isDirectory: () => true }),
      stat: () => ({ mtime: new Date(), birthtime: new Date() })
    }));
    const FileService = await loadSubject();
    config.dryrun = false;
    const subject = new FileService(config);

    expect(
      await subject.moveToLibrary(TestHelper.sampleFile.image.jpg.default)
    ).toContain("_1");
    expect(mv).toHaveBeenCalledTimes(1);
  });

  it("moveToLibrary replace", async () => {
    const trash = jest.fn().mockImplementation(() => Promise.resolve());
    const mv = jest.fn().mockImplementation((f, d, cb) => cb());
    jest.doMock("mv", () => mv);
    jest.doMock("trash", () => trash);
    jest.doMock("fs-extra", () => ({
      copyFile: async () => {},
      pathExists: jest
        .fn()
        .mockImplementationOnce(async () => true)
        .mockImplementationOnce(async () => true)
        .mockImplementationOnce(async () => false),
      lstatSync: () => ({ isDirectory: () => true }),
      stat: () => ({ isSymbolicLink: () => false })
    }));
    const FileService = await loadSubject();
    config.dryrun = false;
    const subject = new FileService(config);

    expect(
      await subject.moveToLibrary(TestHelper.sampleFile.image.jpg.default, true)
    ).toBe("__tests__/sample/firefox.jpg");
    expect(trash).toBeCalledWith(
      [path.resolve(TestHelper.sampleFile.image.jpg.default)],
      { glob: false }
    );
    expect(mv).toHaveBeenCalledTimes(1);
  });

  it("moveToLibrary manual", async () => {
    const mv = jest.fn().mockImplementation((f, d, cb) => cb());
    jest.doMock("mv", () => mv);
    const FileService = await loadSubject();
    config.dryrun = false;
    config.manual = true;
    const subject = new FileService(config);

    expect(
      await subject.moveToLibrary(TestHelper.sampleFile.image.jpg.default)
    ).toBe(path.resolve(TestHelper.sampleFile.image.jpg.default));
    expect(mv).toHaveBeenCalledTimes(0);
  });

  it("prepareDir", async () => {
    jest.doMock("fs-extra", () => ({
      copyFile: async () => {},
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
      copyFile: async () => {},
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
    expect(trash).toBeCalledWith([path.resolve(src)], { glob: false });

    expect(await subject.delete()).toBeUndefined();
    expect(trash).toBeCalledWith([subject.getSourcePath()], { glob: false });
  });

  it("delete symbolicLink", async () => {
    const unlink = jest.fn().mockImplementation(() => Promise.resolve());
    const fs = {
      stat: () =>
        Promise.resolve({
          isSymbolicLink: () => true
        }),
      unlink,
      copyFile: async () => {},
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
    expect(unlink).toBeCalledWith(path.resolve(src));
  });

  it("delete dryrun", async () => {
    const FileService = await loadSubject();
    config.dryrun = true;
    const subject = new FileService(config);
    const src = "/hoge/fuga/foo.txt";
    expect(await subject.delete(src)).toBeUndefined();
  });

  it("rename", async () => {
    const mv = jest.fn().mockImplementation((f, d, cb) => cb());
    jest.doMock("mv", () => mv);
    jest.doMock("fs-extra", () => ({
      copyFile: async () => {},
      access() {},
      stat() {}
    }));

    const FileService = await loadSubject();
    const subject = new FileService(config);
    const src = "/hoge/fuga/foo.txt";
    const dest = src.replace("foo", "bar");

    expect(await subject.rename(src, dest)).toBeUndefined();
    expect(mv).toBeCalledWith(src, dest, expect.any(Function));
    mv.mockClear();

    expect(await subject.rename(dest)).toBeUndefined();
    expect(mv).toBeCalledWith(
      subject.getSourcePath(),
      dest,
      expect.any(Function)
    );
  });

  it("rename dryrun", async () => {
    const FileService = await loadSubject();
    config.dryrun = true;
    const subject = new FileService(config);
    const src = "/hoge/fuga/foo.txt";
    const dest = src.replace("foo", "bar");
    expect(await subject.rename(src, dest)).toBeUndefined();
  });

  it("fillInsertFileInfo", async () => {
    jest.doMock(
      "../../../src/services/fs/contents/ContentsService",
      () =>
        class C {
          calculatePHash = async () => "1234";

          calculateDHash = async () => "345";
        }
    );
    jest.doMock(
      "../../../src/services/fs/FileCacheService",
      () =>
        class C {
          write = async () => {};
        }
    );
    const FileService = await loadSubject();
    const subject = new FileService(config);
    expect(
      await subject.fillInsertFileInfo(({ type: TYPE_IMAGE }: any))
    ).toMatchObject({ p_hash: "1234", d_hash: "345" });
  });

  it("collectFileInfo", async () => {
    const write = jest.fn().mockImplementation(() => Promise.resolve());
    jest.doMock(
      "../../../src/services/fs/FileCacheService",
      () =>
        class C {
          load = async () => null;

          write = write;
        }
    );
    jest.doMock(
      "../../../src/services/fs/contents/ContentsService",
      () =>
        class C {
          calculatePHash = async () => "1234";

          calculateDHash = async () => "4567";

          readInfo = async () => ({
            damaged: false,
            height: 479,
            width: 500,
            hash: "89ab",
            ratio: 1.0438413361169103
          });
        }
    );
    jest.doMock(
      "../../../src/services/fs/AttributeService",
      () =>
        class C {
          getName = async () => "firefox";

          getFileStat = async () => ({
            size: 36189,
            birthtime: new Date("2017-01-01")
          });

          detectClassifyType = () => TYPE_IMAGE;

          getSourcePath = () => path.resolve("__tests__/sample/firefox.jpg");

          getState = () => STATE_ACCEPTED;

          getDestPath = () =>
            "B:\\Image\\2017\\06-01\\__tests__\\sample\\firefox.jpg";
        }
    );
    const FileService = await loadSubject();
    const subject = new FileService(config);
    expect(await subject.collectFileInfo()).toEqual({
      d_hash: "4567",
      from_path: path.resolve("__tests__/sample/firefox.jpg"),
      hash: "89ab",
      height: 479,
      damaged: false,
      name: "firefox",
      p_hash: "1234",
      ratio: 1.0438413361169103,
      size: 36189,
      state: STATE_ACCEPTED,
      timestamp: new Date("2017-01-01").getTime(),
      to_path: "B:\\Image\\2017\\06-01\\__tests__\\sample\\firefox.jpg",
      type: TYPE_IMAGE,
      width: 500
    });
  });

  it("cached collectFileInfo", async () => {
    const write = jest.fn().mockImplementation(() => Promise.resolve());
    jest.doMock(
      "../../../src/services/fs/FileCacheService",
      () =>
        class C {
          load = async () => ({
            type: TYPE_IMAGE,
            d_hash: undefined,
            from_path: "aaa.jpg"
          });

          write = write;
        }
    );
    jest.doMock(
      "../../../src/services/fs/contents/ContentsService",
      () =>
        class C {
          calculateDHash = async () => 1234;
        }
    );
    config.cache = true;
    config.pHash = true;
    const FileService = await loadSubject();
    const subject: FileService = new FileService(config);
    expect(await subject.collectFileInfo()).toMatchObject({
      d_hash: 1234
    });
    expect(write).toBeCalledWith({
      d_hash: 1234,
      from_path: "aaa.jpg",
      type: TYPE_IMAGE
    });
  });

  it("cached collectFileInfo", async () => {
    const write = jest.fn().mockImplementation(() => Promise.resolve());
    jest.doMock(
      "../../../src/services/fs/FileCacheService",
      () =>
        class C {
          load = async () => ({
            type: TYPE_IMAGE,
            d_hash: undefined,
            from_path: "aaa.jpg"
          });

          write = write;
        }
    );
    jest.doMock(
      "../../../src/services/fs/contents/ContentsService",
      () =>
        class C {
          calculateDHash = async () => 1234;
        }
    );
    config.cache = true;
    config.pHash = true;
    const FileService = await loadSubject();
    const subject: FileService = new FileService(config);
    expect(await subject.collectFileInfo()).toMatchObject({
      d_hash: 1234
    });
    expect(write).toBeCalledWith({
      d_hash: 1234,
      from_path: "aaa.jpg",
      type: TYPE_IMAGE
    });
  });
});
