<script lang="ts" setup>
import { onBeforeMount, ref, type Ref } from 'vue'
import { toRaw } from 'vue'
import * as tf from '@tensorflow/tfjs';
import type { Color } from '@/types/model'
import type { LayersModel } from '@tensorflow/tfjs'
import { store as useBeanStore } from '@/stores/classification.ts'
import MyChart from '@/components/MyChart.vue'

const coffeeBeanStore = useBeanStore()
const CATEGORIES = ['Dark', 'Green', 'Light', 'Medium']
const IMG_SIZE = 50; // 假设 IMG_SIZE 是 50，根据你的实际需求修改
// layers model
const model: Ref<LayersModel> = ref({})
// raw model
let rawModel: LayersModel = {} as LayersModel
// 预测数据组
const predictionArray:Ref<number[]> = ref([])
// 文件输入引用
const fileInputRefs = ref('')
// 图片引用
const imgRefs = ref('')
// 加载态
const predicting = ref(false)
let classification: Ref<string> = ref('')

onBeforeMount(async () => {
  model.value = await tf.loadLayersModel('./model/model.json');
  // 转换为原始对象，否则会因为将模型属性包装在 Proxy 对象而引起报错
  rawModel = toRaw(model.value)
})

/**
 * 分类中文
 * @param cls
 */
function classifyCN(cls: string): string {
  const cn: Color = {
    Dark: '深',
    Light: '浅',
    Medium: '中',
    Green: '绿',
  }

  // 输出类别
  return cn[cls]
}
/**
 * 分类颜色
 * @param cls
 */
function classifyColor(cls: string): string {
  const cn: Color = {
    Dark: '#743e22',
    Light: '#e59703',
    Medium: '#be6811',
    Green: '#736e49',
  }

  // 输出类别
  return cn[cls]
}

/**
 * 打开文件选择对话框
 */
function openFileDialog() {
  fileInputRefs.value.click();
}

/**
 * 处理文件上传回调
 * @param event
 */
async function handleFileUpload(event: Event) {
  const file = event.target.files[0];
  if (file) {
    try {
      // 加载态
      predicting.value = true;
      await loadImage(file);
      const tensorXt = preprocessImage();
      if (model.value) {
        // 进行模型预测等操作
        const prediction  = rawModel.predict(tensorXt);
        // 将预测结果转换为数组
        predictionArray.value = await prediction.data();
        // console.log(Array.from(predictionArray))
        // 找到最大值的索引
        const maxIndex = predictionArray.value.indexOf(Math.max(...predictionArray.value));
        // 获取相应的类别
        classification.value = CATEGORIES[maxIndex];
        predictionArray.value = Array.from(predictionArray.value).map(i => {
          if ( i < 1e-6 ) { return '0.00' }
          return (i * 100).toFixed(2)
        })
        coffeeBeanStore.setPredictionArray(predictionArray.value)
        // console.log(predictionArray.value)


        setTimeout(() => {
          predicting.value = false;
        }, 1000)
        // 释放资源
        tensorXt.dispose();
        prediction.dispose();
      } else {
        predicting.value = false;
        console.error('Model is not loaded yet.');
      }
    } catch (error) {
      predicting.value = false;
      console.error('Error processing the image:', error);
    }
  }
}

/**
 * 读取图片渲染到页面
 * @param file
 */
function loadImage(file: Blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img: HTMLImageElement = imgRefs.value;
    reader.onload = function(e) {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    img.onload = () => {
      resolve(img);
    };
    img.onerror = (error: Error) => {
      reject(error);
    };
  });
}

/**
 * 预处理图片
 */
function preprocessImage() {
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
      // console.log(pixel)
      // 调整通道顺序为 BGR（如果 Python 是 BGR 顺序）
      const temp = pixel[0]
      pixel[0] = pixel[2]
      pixel[2] = temp
      // console.log(pixel)
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
}
</script>

<template>
  <el-card class="my-card">
    <div class="img-container">
      <img ref="imgRefs" id="img" src="" alt="">
    </div>
    <div class="content-container">
      <div id="classification">
        <div class="row-text">烘焙度</div>
        <el-skeleton v-if="predicting" :rows="1" animated></el-skeleton>
        <div v-else class="row-text title" :style="{ color: classifyColor(classification) }">{{ classifyCN(classification) }}</div>
      </div>
      <div id="predict">
        <div class="row-text">预测值</div>
        <el-skeleton v-if="predicting" :rows="4" animated></el-skeleton>
        <template v-else-if="predictionArray.length > 0">
          <div  class="row-text" v-for="(p, index) in ['深', '绿', '浅', '中']" :key="index">{{ p }}: {{ predictionArray[index] }}%</div>
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
        <input type="file" ref="fileInputRefs"  @change="handleFileUpload" style="display: none;" />
      </div>
    </div>
  </el-card>
  <my-chart></my-chart>
</template>

<style lang="scss" scoped>
.my-card {
  width: 500px;
  :deep(.el-card__body) {
    padding: 0;
  }
}
.img-container {
  display: flex;
  height: 300px;
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
  padding: 30px;
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

.my-chart {
  margin-top: 30px;
}
</style>
