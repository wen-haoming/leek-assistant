<script lang="tsx" setup>
import { Button, Table, AutoComplete ,Tooltip} from "ant-design-vue"
import {onMounted, ref, watch, computed, onUnmounted } from "vue"
import { getStockDetails, MarketType, searchStockByMarket, getMarketPrefix } from "../../api"
import { columns } from './utils';
import { RedoOutlined } from '@ant-design/icons-vue';
import dayjs from "dayjs";
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
  pe?: string | number;
  secid?: string;
}

// 修复Template中使用的类型
type StockRecordType = Record<string, any>;

// 在 import 部分添加全局状态
import { useGlobalState } from "../../store";

// 定义props接收市场类型和可选的自定义股票列表
const props = defineProps({
  marketType: {
    type: String as () => MarketType,
    default: MarketType.A
  },
  customStocks: {
    type: Array as () => StockData[],
    default: () => []
  },
  showHeader: {
    type: Boolean,
    default: true
  }
});

// 获取全局状态
const { stockLists, addStockToList, removeStockFromList, setSelectedStock } = useGlobalState();

// 定义股票数据的响应式引用
const stockData = ref<StockData[]>([]);
const loading = ref(false);
const searchValue = ref('');
const searchOptions = ref<StockOption[]>([]);
const searchLoading = ref(false);
// 选中的股票
const selectedStock = ref<StockData | null>(null);
// 添加更新时间字段
const updateTime = ref<string>('');
// 添加轮询定时器引用
const pollingTimer = ref<number | null>(null);

// 使用全局状态中的股票列表
const addedStockCodes = computed(() => {
  return props.customStocks && props.customStocks.length > 0 
    ? [] // 如果有自定义股票，则不使用全局状态
    : stockLists.value[props.marketType];
});

// 移除 getDefaultStocks 函数，因为现在使用全局状态

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
  const secid = record.secid || `${getMarketPrefix(props.marketType, record.code)}${record.code}`;
  
  // 使用全局状态更新选中的股票
  setSelectedStock({
    ...record,
    market: props.marketType,
    secid
  });
};

// 加载股票数据
const loadStockData = async () => {
  // 如果提供了自定义股票列表，则直接使用
  if (props.customStocks && props.customStocks.length > 0) {
    stockData.value = props.customStocks;
    updateTime.value = dayjs().format('HH:mm:ss');
    return;
  }

  loading.value = true;
  try {
    // 使用计算属性获取股票列表
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
      // 从响应中获取更新时间并格式化
      updateTime.value = dayjs().format('HH:mm:ss');
    } else {
      stockData.value = [];
    }
  } catch (error) {
    console.error('加载股票数据失败:', error);
  } finally {
    loading.value = false;
  }
};

// 开始轮询
const startPolling = () => {
  // 先清除可能存在的定时器
  stopPolling();
  
  // 设置新的定时器，每秒钟执行一次
  pollingTimer.value = window.setInterval(() => {
    loadStockData();
  }, 1000);
};

// 停止轮询
const stopPolling = () => {
  if (pollingTimer.value !== null) {
    clearInterval(pollingTimer.value);
    pollingTimer.value = null;
  }
};

// 修改 handleSelectStock 函数，使用全局状态的 addStockToList
const handleSelectStock = (value: string) => {
  if (!addedStockCodes.value.includes(value)) {
    addStockToList(props.marketType, value);
    loadStockData();
  }
}

// 监听市场类型变化，重新加载股票数据
watch(() => props.marketType, (newType) => {
  // 如果有自定义股票，不需要重新加载
  if (props.customStocks && props.customStocks.length > 0) return;
  
  // 切换市场类型时，直接加载数据，不需要重置列表，因为列表已经在全局状态中
  loadStockData();
});

// 监听自定义股票变化
watch(() => props.customStocks, (newStocks) => {
  if (newStocks && newStocks.length > 0) {
    stockData.value = newStocks;
    updateTime.value = dayjs().format('HH:mm:ss');
  } else {
    loadStockData();
  }
}, { deep: true });

// 组件挂载时，加载数据并开始轮询
onMounted(() => {
  loadStockData();
  startPolling();
});

// 组件卸载时，停止轮询
onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <div class="stock-list-container">
    <div class="header" v-if="showHeader">
      <AutoComplete
          show-search
          placeholder="输入代码"
          :options="searchOptions"
          :loading="searchLoading"
          style="flex:1;margin-right: 10px;"
          @search="handleSearch"
          @select="handleSelectStock"
          @keydown.enter="() => {
            if (searchOptions.value.length > 0 && searchOptions.value[0]?.value) {
              const stockCode = searchOptions.value[0].value;
              if (stockCode && !addedStockCodes.value.includes(stockCode)) {
                addedStockCodes.value.push(stockCode);
                loadStockData();
              }
            }
          }"
        />
      <div>
        <Tooltip title="更新时间">
          <span style="color: #ccc;margin-right: 5px;">{{ updateTime || '-' }}</span>
        </Tooltip>
        <Button @click="loadStockData" >
          <template #icon>
            <RedoOutlined />
          </template>
        </Button>
      </div>
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
