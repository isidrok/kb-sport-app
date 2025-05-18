# Exporting the model

https://docs.ultralytics.com/quickstart/

1. `pip install ultralytics`
2. `yolo export model=yolo11n-pose.pt format=tfjs`

# Process images

Let me explain what's happening in these lines of code:
const normalized = img.div(255.0);
When we capture video frames, each pixel has RGB values ranging from 0 to 255
Neural networks typically work better with normalized values between 0 and 1
So we divide all pixel values by 255.0 to convert them from [0,255] range to [0,1] range
For example: a pixel with RGB value (255, 128, 0) becomes (1.0, 0.5, 0)
const batched = normalized.expandDims(0);
YOLOv11n-pose expects input in the shape [batch_size, height, width, channels]
Our current tensor has shape [640, 640, 3] (height, width, RGB channels)
expandDims(0) adds a new dimension at index 0, making the shape [1, 640, 640, 3]
The 1 represents batch size of 1 (we're processing one frame at a time)
This matches exactly what the model expects: [1, 640, 640, 3]
So in summary, we're:
Normalizing the pixel values to make them suitable for the neural network
Reshaping the tensor to match the exact input format that YOLOv11n-pose expects
This preprocessing is crucial for the model to work correctly, as it expects normalized values and a specific input shape.
