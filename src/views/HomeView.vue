<template>
  <el-card class="my-card">
    <div class="img-container">
      <img ref="img" id="img" src="" alt="">
    </div>
    <div class="content-container">
      <div id="classification">
        <div class="row-text">烘焙度</div>
        <div class="row-text title" :style="{ color: classifyColor(classification) }">{{ classifyCN(classification) }}</div>
      </div>
      <div id="predict">
        <div class="row-text">预测值</div>
        <template v-if="predictionArray.length > 0">
          <div class="row-text" v-for="(p, index) in ['深', '绿', '浅', '中']" :key="index">{{ p }}: {{ predictionArray[index] }}%</div>
        </template>
      </div>
    </div>
    <div class="footer">
      <div class="roast-bar">
        <span class="text left">深</span>
        <span class="text">中</span>
        <span class="text right">浅</span>
      </div>
      <div id="input-file">
        <button class="custom-file-button" @click="openFileDialog">选择文件</button>
        <input type="file" ref="fileInput"  @change="handleFileUpload" style="display: none;" />
      </div>
      <div>
        <router-link to="chart" class="btn">图表</router-link>
      </div>
    </div>
  </el-card>
</template>

<script>
import { toRaw } from 'vue'
import * as tf from '@tensorflow/tfjs';
import { store } from '../stores/classification.ts'
let rawModel;
const CATEGORIES = ['Dark', 'Green', 'Light', 'Medium']
const IMG_SIZE = 50; // 假设 IMG_SIZE 是 50，根据你的实际需求修改

export default {
  name: 'HomeView',
  data() {
    return {
      model: null,
      prediction: null,
      classification: null,
      predictionArray: [],
      img: null,
      ast: null,
      coffeeBeanStore: {}
    };
  },
  async mounted() {
    try {
      this.model = await tf.loadLayersModel('./model/model.json');
      rawModel = toRaw(this.model)
      this.coffeeBeanStore = store()
      // this.testModel()
    } catch (error) {
      console.error('Error loading the model:', error);
    }
  },
  methods: {
    async testModel () {
      // 加载预训练模型
      const model = await tf.loadLayersModel('./model/model.json');
      // 读取测试图像
      const imagePath = '/light (1).png';
      const imgElement = document.createElement('img');
      imgElement.src = imagePath;
      imgElement.onload = async function() {
        // 使用 cv.imread 读取图像
        const img = cv.imread(imgElement);

      };
    },
    // 打开文件选择对话框
    openFileDialog() {
      this.$refs.fileInput.click();
    },
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (file) {
        try {
          await this.loadImage(file);
          const tensorXt = this.preprocessImage();
          if (this.model) {
            // 进行模型预测等操作
            const prediction  = await rawModel.predict(tensorXt);
            // 将预测结果转换为数组
            const predictionArray = await prediction.data();
            // console.log(Array.from(predictionArray))
            // 找到最大值的索引
            const maxIndex = predictionArray.indexOf(Math.max(...predictionArray));
            // 获取相应的类别
            this.classification = CATEGORIES[maxIndex];
            this.predictionArray = Array.from(predictionArray).map(i => {
              if ( i < 1e-6 ) { return '0.00' }
              return (i * 100).toFixed(2)
            })
            this.coffeeBeanStore.setPredictionArray(this.predictionArray)
            console.log(this.predictionArray)

            // 释放资源
            tensorXt.dispose();
            prediction.dispose();
          } else {
            console.error('Model is not loaded yet.');
          }
        } catch (error) {
          console.error('Error processing the image:', error);
        }
      }
    },
    loadImage(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const img = this.$refs.img;
        reader.onload = function(e) {
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        img.onload = () => {
          resolve(img);
        };
        img.onerror = (error) => {
          reject(error);
        };
      });
    },
    preprocessImage() {
      // 使用 cv.imread 读取图像
      const img = cv.imread('img');
      // const IMG_SIZE = 50;
      // 创建一个 cv.Mat 对象用于存储缩放后的图像
      const newMat = new cv.Mat();
      // 使用 cv.resize 进行图像缩放
      cv.resize(img, newMat, new cv.Size(IMG_SIZE, IMG_SIZE), 0, 0, cv.INTER_LINEAR);
      // 将 cv.Mat 对象转换为数组
      const new_array = [];
      for (let i = 0; i < IMG_SIZE; i++) {
        const row = [];
        for (let j = 0; j < IMG_SIZE; j++) {
          const pixel = [];
          // 只取 RGB 通道，忽略 alpha 通道
          for (let k = 0; k < 3; k++) {
            // 每个像素有 4 个值（RGBA），所以要乘以 4 来跳过 alpha 通道
            pixel.push(newMat.data[(i * IMG_SIZE * 4 + j * 4 + k)]);
          }
          console.log(pixel)
          // 调整通道顺序为 BGR（如果 Python 是 BGR 顺序）
          const temp = pixel[0]
          pixel[0] = pixel[2]
          pixel[2] = temp
          console.log(pixel)
          row.push(pixel);
        }

        new_array.push(row);
      }
      // 将图像数据归一化到 0 到 1 范围
      for (let i = 0; i < IMG_SIZE; i++) {
        for (let j = 0; j < IMG_SIZE; j++) {
          for (let k = 0; k < 3; k++) {
            new_array[i][j][k] = new_array[i][j][k] / 255;
          }
        }
      }

      // console.log(new_array)
      // 将 new_array 转换为 TensorFlow.js 的张量，并添加 batch_size 维度
      let tensorXt = tf.tensor(new_array);
      // 检查模型的输入形状
      const inputShape = rawModel.inputs[0].shape;
      // 如果模型期望的 batch_size 不为 1，调整 batch_size 维度
      if (inputShape[0]!== 1) {
        tensorXt = tensorXt.expandDims(0);
      }
      // 如果模型期望的 height, width, channels 与当前不同，使用 reshape
      if (inputShape[1]!== IMG_SIZE || inputShape[2]!== IMG_SIZE || inputShape[3]!== 3) {
        tensorXt = tensorXt.reshape(inputShape);
      }

      img.delete();
      newMat.delete();
      // 将 Xt 转换为 TensorFlow.js 的张量
      return tensorXt;
    },
    async predict(input) {
      try {
        const output = await rawModel.predict(input);
        // 将预测结果转换为数组
        const predictionArray = await output.data();
        // const prediction = output.dataSync()[0];
        return predictionArray;
      } catch (error) {
        console.error('Error during prediction:', error);
      }
    },
    classifyCN(cls) {
      const cn = {
        Dark: '深',
        Light: '浅',
        Medium: '中',
        Green: '绿',
      }

      // 输出类别
      return cn[cls]
    },
    classifyColor(cls) {
      const cn = {
        Dark: '#743e22',
        Light: '#e59703',
        Medium: '#be6811',
        Green: '#736e49',
      }

      // 输出类别
      return cn[cls]
    }
  }
};
</script>

<style lang="scss" scoped>
.my-card {
  min-width: 30vw;
  :deep(.el-card__body) {
    padding: 0;
  }
}
.img-container {
  display: flex;
  height: 20rem;
  width: 100%;
  justify-content: center;
  align-items: center;

  background-color: var(--el-fill-color-light);;
  .el-image {
    width: 100%;
  }
  .image-slot {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
    font-size: 30px;
  }
}

.content-container {
  display: flex;
  min-height: 30vh;
  padding: 2rem;
  justify-content: flex-start;
  align-items: center;
  flex-direction: column;

  .row-text {
    font-size: 22px;
    text-align: center;

    &.title {
      font-size: 32px;
      font-weight: bold;
    }
  }

  #predict {
    margin: 16px 0;
    color: #6f6f6f;
  }
}

.footer {
  padding: 0 30px 22px;

  .roast-bar {
    display: flex;
    width: 100%;
    height: 50px;
    border-radius: 8px;
    color: #fff;
    background: linear-gradient(to right, #76421b, #e49804);
    align-items: center;

    .text {
      flex: 1;
      text-align: center;
    }

    .right {
      padding-right: 16px;
      text-align: right;
    }

    .left {
      padding-left: 16px;
      text-align: left;
    }
  }

  .custom-file-button {
    display: block;
    height: 45px;
    width: 100%;
    padding: 10px 20px;
    margin-top: 16px;
    border: 1px solid #a6a6a8;
    border-radius: 5px;
    background-color: #fff;
    color: #866441;
    cursor: pointer;
    font-size: 16px;

    &:hover {
      background-color: #f5f5f5;
    }
  }
}
</style>
