<script lang="ts" setup>
import { defineComponent } from 'vue'
import { toRaw } from 'vue'
import * as tf from '@tensorflow/tfjs';
const CATEGORIES = ['Dark', 'Green', 'Light', 'Medium']
const IMG_SIZE = 50; // 假设 IMG_SIZE 是 50，根据你的实际需求修改

class Model {
  name: string;
  predict(): object;
}

const model = await tf.loadLayersModel('./model/model.json');
console.log(model)
const rawModel: Model = toRaw(model)
const predictionArray: number[] = []
let classification: string

type Color = {
  [key: string]: string;
  Dark: string;
  Light: string;
  Medium: string;
  Green: string;
}

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
</script>

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
    </div>
  </el-card>
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
</style>
