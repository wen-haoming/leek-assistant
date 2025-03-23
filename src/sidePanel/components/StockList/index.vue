<script lang="tsx" setup>
import { Button, Table, AutoComplete } from "ant-design-vue"
import { onMounted, ref, watch } from "vue"
import { getStockDetails, MarketType, searchStockByMarket, getMarketPrefix } from "../../api"
import { columns } from './utils';
import { RedoOutlined } from '@ant-design/icons-vue';
// 定义类型
interface StockOption {
  value: string;
  label: string;
  code: string;
  name: string;
  price: string;
  change: string;
}

interface StockData {
  code: string;
  name: string;
  price: string | number;
  change: string | number;
  pe: string | number;
}

// 修复Template中使用的类型
type StockRecordType = Record<string, any>;

// 定义props接收市场类型
const props = defineProps({
  marketType: {
    type: String as () => MarketType,
    default: MarketType.A
  }
});

// 定义股票数据的响应式引用
const stockData = ref<StockData[]>([]);
const loading = ref(false);
const searchValue = ref('');
const searchOptions = ref<StockOption[]>([]);
const searchLoading = ref(false);
// 选中的股票
const selectedStock = ref<StockData | null>(null);

// 已添加的股票代码列表 - 根据市场类型初始化不同的默认股票
const addedStockCodes = ref(getDefaultStocks(props.marketType));

// 根据市场类型获取默认股票列表
function getDefaultStocks(marketType: MarketType): string[] {
  switch (marketType) {
    case MarketType.A:
      return ['0.000725', '1.600036', '0.000001', '0.000858', '1.601318'];
    case MarketType.HK:
      return ['116.00700', '116.00388', '116.09988', '116.01211', '116.03690'];
    case MarketType.US:
      return ['105.AAPL', '105.MSFT', '105.GOOG', '105.AMZN', '105.NVDA'];
    default:
      return [];
  }
}

// 实现搜索股票的函数
const handleSearch = async (keyword: string) => {
  if (!keyword) {
    searchOptions.value = [];
    return;
  }
  searchLoading.value = true;
  try {
    // 使用带市场类型的股票搜索接口
    const detail = await searchStockByMarket(keyword, props.marketType);

    if (detail?.data) {
      const { f57: code, f58: name, f43: price, f170: change } = detail.data;
      // 使用市场前缀函数获取正确的前缀
      const marketPrefix = getMarketPrefix(props.marketType, code);
      searchOptions.value = [{
        value: `${marketPrefix}${code}`,
        label: `${name} (${code}) ${price.toFixed(2)} ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
        code,
        name,
        price: price.toFixed(2),
        change: change.toFixed(2)
      }];
      // 立即更新搜索值为当前选项
      searchValue.value = searchOptions.value[0].value;
    } else {
      searchOptions.value = [];
    }
  } catch (error) {
    console.error('搜索股票失败:', error);
    searchOptions.value = [];
  } finally {
    searchLoading.value = false;
  }
};

// 处理表格行点击事件
const handleRowClick = (record: StockData) => {
  selectedStock.value = record;
  // 发送事件通知父组件
  const event = new CustomEvent('stockSelected', {
    detail: {
      stock: record,
      secid: `${getMarketPrefix(props.marketType, record.code)}${record.code}`
    }
  });
  window.dispatchEvent(event);
};

// 加载股票数据
const loadStockData = async () => {
  loading.value = true;
  try {
    const stockList = addedStockCodes.value;
    const response = await getStockDetails(stockList, props.marketType);
    // 处理返回的数据，转换为表格需要的格式
    if (response?.data?.diff) {
      stockData.value = response.data.diff.map(item => ({
        code: item.f12,
        name: item.f14,
        price: typeof item.f2 === 'number' ? item.f2.toFixed(2) : item.f2,
        change: typeof item.f3 === 'number' ? item.f3.toFixed(2) : item.f3,
        pe: typeof item.f9 === 'number' ? item.f9.toFixed(2) : item.f9,
      }));
    } else {
      stockData.value = [];
    }
  } catch (error) {
    console.error('加载股票数据失败:', error);
  } finally {
    loading.value = false;
  }
};

const handleSelectStock = (value: string) => {
  if (!addedStockCodes.value.includes(value)) {
    addedStockCodes.value.push(value);
    loadStockData();
  }
}

// 监听市场类型变化，重新加载股票数据
watch(() => props.marketType, (newType) => {
  // 切换市场类型时，重置已添加的股票代码并重新加载
  addedStockCodes.value = getDefaultStocks(newType);
  loadStockData();
});

onMounted(() => {
  loadStockData();
})
</script>

<template>
  <div class="stock-list-container">
    <div class="header">
      <div class="search-container">
        <AutoComplete
            show-search
            placeholder="输入代码"
            :options="searchOptions"
            :loading="searchLoading"
            style="width: 250px"
            @search="handleSearch"
            @select="handleSelectStock"
            @keydown.enter="() => {
              if (searchOptions.length > 0) {
                const stockCode = searchOptions[0].value;
                if (stockCode && !addedStockCodes.value.includes(stockCode)) {
                  addedStockCodes.value.push(stockCode);
                  loadStockData();
                }
              }
            }"
          />
      </div>
      <Button @click="loadStockData" :loading="loading">
        <template #icon>
          <RedoOutlined />
        </template>
      </Button>
    </div>
    <Table 
    :showHeader="false"
    :columns="columns" 
    :data-source="stockData" 
    :pagination="false"
     size="small"
      class="custom-table" 
      :bordered="false"
      :row-class-name="(record: StockRecordType) => record.code === selectedStock?.code ? 'selected-row' : ''"
      :customRow="(record: StockRecordType) => {
          return {
            onClick: () => handleRowClick(record as StockData)
          };
        }">
      <template #emptyText>
        <div class="empty-container">暂无股票数据</div>
      </template>
    </Table>
  </div>
</template>

<style scoped lang="less">
.stock-list-container {
  padding: 5px;
  background-color: #fff;
  border-radius: 8px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.search-container {
  display: flex;
  align-items: center;
}

.custom-table {
  overflow: hidden;
  :deep(.ant-table.ant-table-small){
    .ant-table-cell{
      padding:2px;
    }
  }
}

:deep(.ant-table) {
  border-radius: 6px;
}

:deep(.ant-table-thead > tr > th) {
  background-color: #f5f5f5;
  font-size: 13px;
  color: #666;
  font-weight: 500;
  padding: 8px 12px;
}

:deep(.ant-table-tbody > tr > td) {
  padding: 10px 12px;
  transition: background-color 0.2s;
}

.stock-name {
  display: flex;
  flex-direction: column;
}

.stock-title {
  font-weight: 500;
  font-size: 14px;
}

.stock-code {
  font-size: 12px;
  /* color: #ccc; */
}

.up {
  color: #f5222d;
  font-weight: 500;
  font-size: 14px;
}

.down {
  color: #52c41a;
  font-weight: 500;
  font-size: 14px;
}

.empty-container {
  padding: 24px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

:deep(.ant-table-tbody > tr:hover > td) {
  background-color: #f9f9f9;
}

/* 添加选中行的样式 */
.selected-row {
  background-color: #e6f7ff !important;
}

:deep(.selected-row:hover > td) {
  background-color: #e6f7ff !important;
}
</style>
