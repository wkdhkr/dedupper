// @flow
export default class QueueHelper {
  static operationWaitPromises: Promise<any>[] = [];

  static waitOperationWaitPromises = async (): Promise<void> => {
    await Promise.all(QueueHelper.operationWaitPromises);
    QueueHelper.operationWaitPromises = [];
  };

  static appendOperationWaitPromise = (p: Promise<any>) => {
    QueueHelper.operationWaitPromises.push(p);
  };
}
