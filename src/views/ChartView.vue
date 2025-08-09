<template>
  <v-chart class="chart" :option="option" />
</template>

<script setup lang="ts">
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { PieChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent
} from "echarts/components";
import VChart, { THEME_KEY } from "vue-echarts";
import { ref, provide } from "vue";
import { store } from '../stores/classification.ts';

use([
  CanvasRenderer,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent
]);

provide(THEME_KEY, "light");

const CATEGORIES = ['Dark', 'Green', 'Light', 'Medium']
const coffeeBeanStore = store()
// ['0.00', '0.02', '99.87', '0.11']
console.log(coffeeBeanStore.predictionArray)

const option = ref({
  title: {
    text: "咖啡豆烘焙度",
    left: "center"
  },
  tooltip: {
    trigger: "item",
    formatter: "{a} <br/>{b} : {c} ({d}%)"
  },
  legend: {
    orient: "vertical",
    left: "left",
    data: CATEGORIES
  },
  series: [
    {
      name: "烘焙度",
      type: "pie",
      radius: "55%",
      center: ["50%", "60%"],
      data: [
        { value: coffeeBeanStore.predictionArray[0], name: CATEGORIES[0] },
        { value: coffeeBeanStore.predictionArray[1], name: CATEGORIES[1] },
        { value: coffeeBeanStore.predictionArray[2], name: CATEGORIES[2] },
        { value: coffeeBeanStore.predictionArray[3], name: CATEGORIES[3] },
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: "rgba(0, 0, 0, 0.5)"
        }
      }
    }
  ]
});
</script>

<style scoped>
.chart {
  height: 400px;
}
</style>
