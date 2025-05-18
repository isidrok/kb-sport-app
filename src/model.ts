import {
  GraphModel,
  loadGraphModel,
  browser as tfBrowser,
  tidy,
  image,
  Tensor,
  concat,
  sub,
  div,
  add,
  slice,
  squeeze,
  type Tensor3D,
} from "@tensorflow/tfjs";

class Model {
  private model!: GraphModel;
  private inputShape!: [number, number, number, number];

  async init() {
    const modelURL = "yolo8n-pose_web_model/model.json";
    console.log("Loading model from:", modelURL);
    this.model = await loadGraphModel(modelURL, {
      onProgress: (fraction) => {
        console.log(`Loading model`, fraction);
      },
    });
    this.inputShape = this.model.inputs[0].shape as [
      number,
      number,
      number,
      number
    ];
  }
  process(video: HTMLVideoElement) {
    const frame = this.getFrame(video);
    const predictions = this.model.predict(frame) as Tensor;
  }
  /**
   * Returns a frame from the video.
   * YOLOv8n-pose expects input in the shape [batch_size, height, width, channels]
   * The input needs to be:
   * 1. Padded to be square if the input isn't already square
   * 2. Resized to 640x640
   * 3. Normalized to values between 0 and 1 (divided by 255)
   * 4. Have a batch dimension added
   * @param video - The video to get a frame from.
   * @returns The tensor ready for process.
   */
  private getFrame(video: HTMLVideoElement) {
    return tidy(() => {
      const frame = tfBrowser.fromPixels(video);
      const [modelHeight, modelWidth] = this.inputShape.slice(1, 3);
      const [frameHeight, frameWidth] = frame.shape.slice(0, 2);
      const maxSize = Math.max(frameWidth, frameHeight);
      const padded = frame.pad([
        [0, maxSize - frameHeight],
        [0, maxSize - frameWidth],
        [0, 0],
      ]);
      const float32 = padded.toFloat();
      const normalized = float32.div<Tensor3D>(255.0);
      const resized = image.resizeBilinear(normalized, [
        modelWidth,
        modelHeight,
      ]);
      const batched = resized.expandDims(0);
      return batched;
    });
  }
}
