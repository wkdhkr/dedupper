// @flow
/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
/* eslint prefer-destructuring: 0, no-param-reassign: 0, no-plusplus: 0 */

import { canvas as nodeCanvas } from "../faceApi/commons";

const { createImageData, createCanvas } = nodeCanvas;

const offScreenCanvases: { [name: string]: HTMLCanvasElement } = {};

const CANVAS_NAMES = {
  blurred: "blurred",
  blurredMask: "blurred-mask",
  mask: "mask",
  lowresPartMask: "lowres-part-mask"
};

export const RAINBOW_PART_COLORS = [
  [110, 64, 170],
  [143, 61, 178],
  [178, 60, 178],
  [210, 62, 167],
  [238, 67, 149],
  [255, 78, 125],
  [255, 94, 99],
  [255, 115, 75],
  [255, 140, 56],
  [239, 167, 47],
  [217, 194, 49],
  [194, 219, 64],
  [175, 240, 91],
  [135, 245, 87],
  [96, 247, 96],
  [64, 243, 115],
  [40, 234, 141],
  [28, 219, 169],
  [26, 199, 194],
  [33, 176, 213],
  [47, 150, 224],
  [65, 125, 224],
  [84, 101, 214],
  [99, 81, 195]
];

function renderImageToCanvas(image: any, canvas: HTMLCanvasElement) {
  const { width, height } = image;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(image, 0, 0, width, height);
}

function renderImageDataToCanvas(image: any, canvas: HTMLCanvasElement) {
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");

  ctx.putImageData(image, 0, 0);
}

function assertSameDimensions(
  { width: widthA, height: heightA }: any,
  { width: widthB, height: heightB }: any,
  nameA: string,
  nameB: string
) {
  if (widthA !== widthB || heightA !== heightB) {
    throw new Error(
      `error: dimensions must match. ${nameA} has dimensions ${widthA}x${heightA}, ${nameB} has dimensions ${widthB}x${heightB}`
    );
  }
}

function flipCanvasHorizontal(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  ctx.scale(-1, 1);
  ctx.translate(-canvas.width, 0);
}

function createOffScreenCanvas(): HTMLCanvasElement {
  const offScreenCanvas = createCanvas();
  return offScreenCanvas;
}

function ensureOffscreenCanvasCreated(id: string): HTMLCanvasElement {
  if (!offScreenCanvases[id]) {
    offScreenCanvases[id] = createOffScreenCanvas();
  }
  return offScreenCanvases[id];
}

function renderImageDataToOffScreenCanvas(
  image: ImageData,
  canvasName: string
): HTMLCanvasElement {
  const canvas = ensureOffscreenCanvasCreated(canvasName);
  renderImageDataToCanvas(image, canvas);

  return canvas;
}

// eslint-disable-next-line complexity
export function toColoredPartMask(
  partSegmentation: any,
  passedPartColors: any
): ImageData | null {
  let partColors = passedPartColors;
  if (!passedPartColors) {
    partColors = RAINBOW_PART_COLORS;
  }
  if (Array.isArray(partSegmentation) && partSegmentation.length === 0) {
    return null;
  }
  let multiPersonPartSegmentation;
  if (!Array.isArray(partSegmentation)) {
    multiPersonPartSegmentation = [partSegmentation];
  } else {
    multiPersonPartSegmentation = partSegmentation;
  }
  const a = multiPersonPartSegmentation[0];
  const { width } = a;
  const { height } = a;
  const bytes = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < height * width; ++i) {
    const j = i * 4;
    bytes[j + 0] = 255;
    bytes[j + 1] = 255;
    bytes[j + 2] = 255;
    bytes[j + 3] = 255;
    for (let k = 0; k < multiPersonPartSegmentation.length; k++) {
      const partId = multiPersonPartSegmentation[k].data[i];
      if (partId !== -1) {
        const color = partColors[partId];
        if (!color) {
          throw new Error(`No color could be found for part id ${partId}`);
        }
        bytes[j + 0] = color[0];
        bytes[j + 1] = color[1];
        bytes[j + 2] = color[2];
        bytes[j + 3] = 255;
      }
    }
  }
  return createImageData(bytes, width, height);
}

function drawAndBlurImageOnCanvas(
  image: any,
  blurAmount: number,
  canvas: HTMLCanvasElement
) {
  const { height, width } = image;
  const ctx = canvas.getContext("2d");
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  (ctx: any).filter = `blur(${blurAmount}px)`;
  ctx.drawImage(image, 0, 0, width, height);
  ctx.restore();
}

function drawAndBlurImageOnOffScreenCanvas(
  image: any,
  blurAmount: number,
  offscreenCanvasName: string
): HTMLCanvasElement {
  const canvas = ensureOffscreenCanvasCreated(offscreenCanvasName);
  if (blurAmount === 0) {
    renderImageToCanvas(image, canvas);
  } else {
    drawAndBlurImageOnCanvas(image, blurAmount, canvas);
  }
  return canvas;
}

export function drawMask(
  canvas: any,
  image: any,
  maskImage: any,
  maskOpacity: any,
  maskBlurAmount: any,
  flipHorizontal: boolean
) {
  if (!maskOpacity) {
    maskOpacity = 0.7;
  }
  if (!maskBlurAmount) {
    maskBlurAmount = 0;
  }
  if (!flipHorizontal) {
    flipHorizontal = false;
  }
  const height = image.height;
  const width = image.width;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.save();
  if (flipHorizontal) {
    flipCanvasHorizontal(canvas);
  }
  ctx.drawImage(image, 0, 0);
  ctx.globalAlpha = maskOpacity;
  if (maskImage) {
    assertSameDimensions({ width, height }, maskImage, "image", "mask");
    const mask = renderImageDataToOffScreenCanvas(maskImage, CANVAS_NAMES.mask);
    const blurredMask = drawAndBlurImageOnOffScreenCanvas(
      mask,
      maskBlurAmount,
      CANVAS_NAMES.blurredMask
    );
    ctx.drawImage(blurredMask, 0, 0, width, height);
  }
  ctx.restore();
}
