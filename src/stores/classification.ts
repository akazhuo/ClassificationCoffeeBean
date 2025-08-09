import { defineStore } from 'pinia'

export const store = defineStore('classificationCoffeeBean', {
  state: () => {
    return {
      predictionArray: [] as number[],
    }
  },
  actions: {
    setPredictionArray (payload: number[]): void {
      this.predictionArray = payload
    }
  }
})
