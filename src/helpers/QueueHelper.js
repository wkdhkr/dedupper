// @flow
export default class QueueHelper {
  static operationWaitPromises: Promise<any>[] = [];

  static async waitOperationWaitPromises() {
    await Promise.all(QueueHelper.operationWaitPromises);
    QueueHelper.operationWaitPromises = [];
  }

  static appendOperationWaitPromise(p: Promise<void>) {
    QueueHelper.operationWaitPromises.push(p);
  }
}
