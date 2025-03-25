<script setup lang="tsx">
import { ref, onMounted, onUnmounted } from 'vue';
import { getStockDetails, MarketType } from "../../api";
import StockList from '../StockList/index.vue';
import { Radio, Tag } from 'ant-design-vue';

// 定义指数接口
interface IndexItem {
  name: string;
  code: string;
  price: string | number;
  change: string | number;
  secid: string;
  market: MarketType;
}

// 定义市场配置接口
interface MarketConfig {
  title: string;
  type: MarketType;
  indices: IndexItem[];
}

// 加载状态
const loading = ref(false);
const currentMarket = ref('1');

// 市场配置
const marketsConfig = ref<MarketConfig[]>([
  {
    title: 'A股指数',
    type: MarketType.A,
    indices: [
      { name: '上证指数', code: '000001', price: '0.00', change: '0.00', secid: '0.000001', market: MarketType.A },
      { name: '深证成指', code: '399001', price: '0.00', change: '0.00', secid: '0.399001', market: MarketType.A },
      { name: '创业板指', code: '399006', price: '0.00', change: '0.00', secid: '0.399006', market: MarketType.A },
      { name: '沪深300', code: '000300', price: '0.00', change: '0.00', secid: '0.000300', market: MarketType.A }
    ]
  },
  {
    title: '港股指数',
    type: MarketType.HK,
    indices: [
      { name: '恒生指数', code: 'HSI', price: '0.00', change: '0.00', secid: '116.HSI', market: MarketType.HK },
      { name: '恒生国企', code: 'HSCEI', price: '0.00', change: '0.00', secid: '116.HSCEI', market: MarketType.HK },
      { name: '恒生科技', code: 'HSTECH', price: '0.00', change: '0.00', secid: '116.HSTECH', market: MarketType.HK }
    ]
  },
  {
    title: '美股指数',
    type: MarketType.US,
    indices: [
      { name: '道琼斯', code: '.DJI', price: '0.00', change: '0.00', secid: '105..DJI', market: MarketType.US },
      { name: '纳斯达克', code: '.IXIC', price: '0.00', change: '0.00', secid: '105..IXIC', market: MarketType.US },
      { name: '标普500', code: '.INX', price: '0.00', change: '0.00', secid: '105..INX', market: MarketType.US }
    ]
  }
]);

// 加载所有指数数据
const loadAllIndicesData = async () => {
  loading.value = true;
  
  try {
    // 并行请求所有市场的数据
    const requests = marketsConfig.value.map(market => {
      const secidList = market.indices.map(index => index.secid);
      return getStockDetails(secidList, market.type);
    });
    
    const responses = await Promise.all(requests);
    
    // 更新各市场数据
    responses.forEach((response, index) => {
      const market = marketsConfig.value[index];
      
      if (response?.data?.diff && response.data.diff.length > 0) {
        response.data.diff.forEach((item) => {
          const indexItem = market.indices.find(idx => idx.code === item.f12);
          if (indexItem) {
            indexItem.price = typeof item.f2 === 'number' ? item.f2.toFixed(2) : item.f2;
            indexItem.change = typeof item.f3 === 'number' ? item.f3.toFixed(2) : item.f3;
          }
        });
      }
    });
  } catch (error) {
    console.error('加载指数数据失败:', error);
  } finally {
    loading.value = false;
  }
};

// 定期刷新数据（每分钟刷新一次）
let refreshInterval: number | null = null;

onMounted(() => {
  loadAllIndicesData();
  
  // 设置定时刷新
  refreshInterval = window.setInterval(() => {
    loadAllIndicesData();
  }, 60000);
});

onUnmounted(() => {
  // 清除定时器
  if (refreshInterval !== null) {
    clearInterval(refreshInterval);
  }
});
</script>

<template>
  <div class="market-container">
    <Radio.Group v-model:value="currentMarket" button-style="solid" class="market-radio-group">
      <Radio.Button value="1" class="market-radio-item">
        A
      </Radio.Button>
      <Radio.Button value="2" class="market-radio-item">
        <Tag color="purple" :bordered="false">港</Tag>
      </Radio.Button>
      <Radio.Button value="3" class="market-radio-item">
        <Tag color="cyan" :bordered="false">美</Tag>
      </Radio.Button>
    </Radio.Group>
    
    <div class="market-content">
      <StockList 
        v-if="currentMarket === '1'"
        :customStocks="marketsConfig[0].indices" 
        :marketType="MarketType.A" 
        :showHeader="false"
        class="index-list"
      />
      <StockList 
        v-if="currentMarket === '2'"
        :customStocks="marketsConfig[1].indices" 
        :marketType="MarketType.HK" 
        :showHeader="false"
        class="index-list"
      />
      <StockList 
        v-if="currentMarket === '3'"
        :customStocks="marketsConfig[2].indices" 
        :marketType="MarketType.US" 
        :showHeader="false"
        class="index-list"
      />
    </div>
  </div>
</template>

<style scoped lang="less">
.market-container {
  width: 100%;
  padding: 8px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
  position: relative;
  
  .market-radio-group {
    width: 100%;
    display: flex;
    margin-bottom: 12px;
    
    .market-radio-item {
      flex: 1;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
  
  .market-content {
    .index-list {
      margin-bottom: 0;
    }
  }
}
</style>
