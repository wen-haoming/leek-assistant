import { createGlobalState, useLocalStorage } from '@vueuse/core'
import { computed, shallowRef, ref } from 'vue'
import { MarketType } from './api'

const defaultStockLists = {
  [MarketType.A]: [] as string[],
  [MarketType.HK]: [] as string[],
  [MarketType.US]: [] as string[]
};

export const useGlobalState = createGlobalState(
  () => {
    // state
    const count = shallowRef(0)
    // getters
    const doubleCount = computed(() => count.value * 2)
    // actions
    function increment() {
      count.value++
    }

    // 使用 useLocalStorage 来管理股票列表
    const stockLists = useLocalStorage('leekAssistant_stockLists', defaultStockLists);

    // 添加股票到指定市场列表
    function addStockToList(marketType: MarketType, stockCode: string) {
      if (!stockLists.value[marketType].includes(stockCode)) {
        stockLists.value = {
          ...stockLists.value,
          [marketType]: [...stockLists.value[marketType], stockCode]
        };
      }
    }

    // 从指定市场列表中移除股票
    function removeStockFromList(marketType: MarketType, stockCode: string) {
      stockLists.value = {
        ...stockLists.value,
        [marketType]: stockLists.value[marketType].filter(code => code !== stockCode)
      };
    }

    // 重置为默认列表
    function resetStockLists() {
      stockLists.value = defaultStockLists;
    }

    // 添加选中股票的状态
    const selectedStock = ref(null);

    // 设置选中的股票
    function setSelectedStock(stock: any) {
      selectedStock.value = stock;
    }

    return { 
      count, 
      doubleCount, 
      increment, 
      stockLists, 
      addStockToList, 
      removeStockFromList,
      resetStockLists,
      // 添加新的状态和方法
      selectedStock,
      setSelectedStock,
      
    }
  }
)
