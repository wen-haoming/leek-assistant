import { createGlobalState } from '@vueuse/core'
import { computed, shallowRef, onMounted, ref } from 'vue'
import { MarketType } from './api'

// 默认股票列表
const defaultStockLists = {
  [MarketType.A]: [ '0.000001', '0.000858', '1.601318'],
  [MarketType.HK]: ['116.00700', '116.00388', '116.09988', '116.01211', '116.03690'],
  [MarketType.US]: ['105.AAPL', '105.MSFT', '105.GOOG', '105.AMZN', '105.NVDA']
};

// 保存数据到 chrome.storage
const saveToStorage = (data: any) => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ stockLists: data });
  } else {
    // 在非浏览器插件环境下，使用 localStorage 作为备选
    localStorage.setItem('leekAssistant_stockLists', JSON.stringify(data));
  }
};

// 从 chrome.storage 加载数据
const loadFromStorage = async (): Promise<any> => {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('stockLists', (result) => {
        resolve(result.stockLists || defaultStockLists);
      });
    } else {
      // 在非浏览器插件环境下，使用 localStorage 作为备选
      const saved = localStorage.getItem('leekAssistant_stockLists');
      resolve(saved ? JSON.parse(saved) : defaultStockLists);
    }
  });
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

    // 股票列表相关状态，初始使用默认值
    const stockLists = ref(defaultStockLists);

    // 初始化时从存储中加载数据
    onMounted(async () => {
      const savedLists = await loadFromStorage();
      stockLists.value = savedLists;
    });

    // 添加股票到指定市场列表
    function addStockToList(marketType: MarketType, stockCode: string) {
      if (!stockLists.value[marketType].includes(stockCode)) {
        const newLists = {
          ...stockLists.value,
          [marketType]: [...stockLists.value[marketType], stockCode]
        };
        stockLists.value = newLists;
        saveToStorage(newLists);
      }
    }

    // 从指定市场列表中移除股票
    function removeStockFromList(marketType: MarketType, stockCode: string) {
      const newLists = {
        ...stockLists.value,
        [marketType]: stockLists.value[marketType].filter(code => code !== stockCode)
      };
      stockLists.value = newLists;
      saveToStorage(newLists);
    }

    // 重置为默认列表
    function resetStockLists() {
      stockLists.value = defaultStockLists;
      saveToStorage(defaultStockLists);
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
      setSelectedStock
    }
  }
)
