# Exporting the model

https://docs.ultralytics.com/quickstart/

1. `pip install ultralytics`
2. `yolo export model=yolov8n-pose.pt format=tfjs`

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

# scores

| Output    | Shape   | Example (for 3 people)                                                                                   |
| --------- | ------- | -------------------------------------------------------------------------------------------------------- |
| boxes     | [3, 4]  | [[100,150,300,450], [350,120,500,400], [50,500,200,630]]                                                 |
| keypoints | [3, 51] | [                                                                                                        |
|           |         | [200,220,0.98, 180,210,0.95, 220,210,0.96, 170,220,0.90, 230,220,0.91, ..., 150,600,0.90, 250,600,0.90], |
|           |         | [400,200,0.97, 380,190,0.94, 420,190,0.95, 370,200,0.89, 430,200,0.90, ..., 390,590,0.88, 470,580,0.89], |
|           |         | [120,520,0.96, 110,510,0.93, 130,510,0.94, 105,520,0.88, 135,520,0.89, ..., 150,610,0.87, 170,620,0.88]  |
|           |         | ]                                                                                                        |
| scores    | [3]     | [0.99, 0.97, 0.95]                                                                                       |

| Detection | x   | y   | w   | h   | conf | nose_x | nose_y | nose_c | left_eye_x | left_eye_y |
| --------- | --- | --- | --- | --- | ---- | ------ | ------ | ------ | ---------- | ---------- |
| 0         | 100 | 150 | 200 | 300 | 0.99 | 200    | 220    | 0.98   | 180        | 210        |
| 1         | 350 | 120 | 150 | 280 | 0.97 | 400    | 200    | 0.97   | 380        | 190        |
| 2         | 50  | 500 | 150 | 130 | 0.95 | 120    | 520    | 0.96   | 110        | 510        |
| 3         | 200 | 300 | 100 | 200 | 0.92 | 250    | 320    | 0.95   | 230        | 310        |
| 4         | 400 | 400 | 120 | 180 | 0.90 | 420    | 420    | 0.94   | 400        | 410        |

| Detection | boxes (x1, y1, x2, y2) | keypoints (51 values) | scores |
| --------- | ---------------------- | --------------------- | ------ |
| 0         | [100, 150, 300, 450]   | [200,220,0.98, ...]   | 0.99   |
| 1         | [350, 120, 500, 400]   | [400,200,0.97, ...]   | 0.97   |
| 2         | [50, 500, 200, 630]    | [120,520,0.96, ...]   | 0.95   |
| ...       | ...                    | ...                   | ...    |
| 8399      | [200, 300, 400, 500]   | [250,320,0.95, ...]   | 0.92   |
