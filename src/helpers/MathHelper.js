// @flow
export default class MathHelper {
  static rotatePoint: (
    x: number,
    y: number,
    centerX: number,
    centerY: number,
    originalAngle: number
  ) => [number, number] = (
    x: number,
    y: number,
    centerX: number,
    centerY: number,
    originalAngle: number
  ): [number, number] => {
    const angle = (originalAngle * Math.PI) / 180;
    const x2 =
      (x - centerX) * Math.cos(angle) -
      (y - centerY) * Math.sin(angle) +
      centerX;
    const y2 =
      (x - centerX) * Math.sin(angle) +
      (y - centerY) * Math.cos(angle) +
      centerY;
    return [x2, y2];
  };

  static getDistanceFromTwoPoint: (
    posX1: number,
    posY1: number,
    posX2: number,
    posY2: number
  ) => number = (
    posX1: number,
    posY1: number,
    posX2: number,
    posY2: number
  ) => {
    return Math.sqrt((posX1 - posX2) ** 2 + (posY1 - posY2) ** 2);
  };

  static getExtendedPoint: (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    percent: number
  ) => Array<number> = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    percent: number
  ) => {
    const length = this.getDistanceFromTwoPoint(x1, y1, x2, y2);
    const extendedLength = length * percent;
    const rx = (-extendedLength * x1 + (length + extendedLength) * x2) / length;
    const ry = (-extendedLength * y1 + (length + extendedLength) * y2) / length;
    return [rx, ry];
  };
}
