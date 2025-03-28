<script lang="tsx" setup>
import { Button, Table, AutoComplete ,Tooltip, Dropdown as ADropdown, Menu as AMenu, MenuProps, Tag, Dropdown } from "ant-design-vue"
import {onMounted, ref, watch, computed, onUnmounted } from "vue"
import { getStockDetails, MarketType, searchStockByMarket, getMarketPrefix } from "../../api"
import { columns } from './utils';
import { RedoOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import dayjs from "dayjs";
// 定义类型
interface StockOption {
  value: string;
  label: string;
  code: string;
  name: string;
  price: string;
  change: string;
  market: MarketType;
}

interface StockData {
  code: string;
  name: string;
  price: string | number;
  change: string | number;
  pe?: string | number;
  secid?: string;
  market?: MarketType;
}

// 修复Template中使用的类型
type StockRecordType = Record<string, any>;

// 在 import 部分添加全局状态
import { useGlobalState } from "../../store";

// 定义props接收市场类型和可选的自定义股票列表
const props = defineProps({
  marketType: {
    type: String as () => MarketType,
    default: MarketType.A // 设置默认值为A股
  },
  customStocks: {
    type: Array as () => StockData[],
    default: () => []
  },
  showHeader: {
    type: Boolean,
    default: true
  },
  canDelete: {
    type: Boolean,
    default: false
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
// 当前选择的搜索市场
const searchMarket = ref<MarketType>(MarketType.A);
// 选中的股票
const selectedStock = ref<StockData | null>(null);
// 添加更新时间字段
const updateTime = ref<string>('');
// 添加轮询定时器引用
const pollingTimer = ref<number | null>(null);

// 右键菜单相关状态
const contextMenuVisible = ref(false);
const contextMenuStyle = ref({
  position: 'fixed',
  top: '0px',
  left: '0px',
  display: 'none'
});
const rightClickedStock = ref<StockData | null>(null);

// 是否显示所有市场（跨市场）
const isShowingAllMarkets = computed(() => !props.marketType || props.marketType === MarketType.A);

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
    let stockDataResults: StockData[] = [];

    // 如果指定了市场类型，只加载该市场的股票
    if (isShowingAllMarkets.value) {
      // 加载所有市场的股票
      const requests = Object.entries(stockLists.value).map(async ([market, codes]) => {
        if (codes.length === 0) return [];
        return await loadStocksByMarket(market as MarketType, codes);
      });
      
      const results = await Promise.all(requests);
      stockDataResults = results.flat();
    } else {
      const stockList = stockLists.value[props.marketType];
      stockDataResults = await loadStocksByMarket(props.marketType, stockList);
    }

    stockData.value = stockDataResults;
    updateTime.value = dayjs().format('HH:mm:ss');
  } catch (error) {
    console.error('加载股票数据失败:', error);
  } finally {
    loading.value = false;
  }
};

// 根据市场类型获取股票数据
const loadStocksByMarket = async (market: MarketType, stockList: string[]) => {
  try {
    const response = await getStockDetails(stockList, market);
    if (response?.data?.diff) {
      return response.data.diff.map(item => ({
        code: item.f12,
        name: item.f14,
        price: typeof item.f2 === 'number' ? item.f2.toFixed(2) : item.f2,
        change: typeof item.f3 === 'number' ? item.f3.toFixed(2) : item.f3,
        pe: typeof item.f9 === 'number' ? item.f9.toFixed(2) : item.f9,
        market,
        secid: `${getMarketPrefix(market, item.f12)}${item.f12}`
      }));
    }
    return [];
  } catch (error) {
    console.error(`加载${market}市场股票数据失败:`, error);
    return [];
  }
};

// 实现搜索股票的函数
const handleSearch = async (keyword: string) => {
  if (!keyword) {
    searchOptions.value = [];
    return;
  }
  searchLoading.value = true;
  try {
    // 使用带市场类型的股票搜索接口
    const detail = await searchStockByMarket(keyword, searchMarket.value);

    if (detail?.data) {
      const { f57: code, f58: name, f43: price, f170: change } = detail.data;
      // 使用市场前缀函数获取正确的前缀
      const marketPrefix = getMarketPrefix(searchMarket.value, code);
      searchOptions.value = [{
        value: `${marketPrefix}${code}`,
        label: `${name} (${code}) ${price.toFixed(2)} ${change >= 0 ? '+' : ''}${change.toFixed(2)}% [${searchMarket.value}]`,
        code,
        name,
        price: price.toFixed(2),
        change: change.toFixed(2),
        market: searchMarket.value
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
  const market = record.market || props.marketType;
  const secid = record.secid || `${getMarketPrefix(market, record.code)}${record.code}`;
  
  // 使用全局状态更新选中的股票
  setSelectedStock({
    ...record,
    market,
    secid
  });
};

// 将股票数据按分组在表格中显示
const groupedStockData = computed(() => {
  // 添加市场标记
  return stockData.value.map(stock => ({
    ...stock,
    marketLabel: stock.market || props.marketType
  }));
});

// 开始轮询
const startPolling = () => {
  // 先清除可能存在的定时器
  stopPolling();
  // 设置新的定时器，每5秒执行一次
  pollingTimer.value = window.setInterval(() => {
    loadStockData();
  }, 5000);
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
  // 检查搜索选项是否存在
  if (searchOptions.value.length > 0) {
    const selectedOption = searchOptions.value[0];
    
    // 添加到对应的市场列表
    addStockToList(selectedOption.market, value);
    loadStockData();
  }
}

// 切换搜索市场
const changeSearchMarket = (market: MarketType) => {
  searchMarket.value = market;
  // 清空搜索
  searchValue.value = '';
  searchOptions.value = [];
};

// 监听市场类型变化，重新加载股票数据
watch(() => props.marketType, () => {
  // 如果有自定义股票，不需要重新加载
  if (props.customStocks && props.customStocks.length > 0) return;
  
  // 切换市场类型时，直接加载数据
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

// 监听全局股票列表变化
watch(() => stockLists.value, () => {
  // 只有在没有自定义股票的情况下才重新加载
  if (!props.customStocks || props.customStocks.length === 0) {
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

// 处理右键点击
const handleRightClick = (e: MouseEvent, record: StockData) => {
  if (!props.canDelete) return;
  
  e.preventDefault();
  rightClickedStock.value = record;
  contextMenuStyle.value = {
    position: 'fixed',
    top: `${e.clientY}px`,
    left: `${e.clientX}px`,
    display: 'block'
  };
  contextMenuVisible.value = true;
};

// 处理菜单可见性变化
const handleContextMenuVisibleChange = (visible: boolean) => {
  contextMenuVisible.value = visible;
  if (!visible) {
    contextMenuStyle.value.display = 'none';
  }
};

// 处理菜单点击
const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
  if (key === 'delete' && rightClickedStock.value && rightClickedStock.value.market) {
    // 从全局状态中移除股票
    const stockCode = rightClickedStock.value.secid || rightClickedStock.value.code;
    removeStockFromList(rightClickedStock.value.market, stockCode);
    
    // 从当前显示中移除
    stockData.value = stockData.value.filter(stock => 
      !(stock.code === rightClickedStock.value?.code && stock.market === rightClickedStock.value?.market)
    );
  }
  contextMenuVisible.value = false;
};

// 扩展列定义，添加市场标记列
const extendedColumns = computed(() => {
  // 使用基础列，不再添加市场标记列
  return [...columns];
});
</script>

<template>
  <div class="stock-list-container">
    <div class="header" v-if="showHeader">
      <div class="search-container">
        <AutoComplete
          show-search
          placeholder="输入代码"
          :options="searchOptions"
          :loading="searchLoading"
          style="flex:1;"
          @search="handleSearch"
          @select="handleSelectStock"
          v-model:value="searchValue"
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
  </div>
    <Table 
      :showHeader="false"
      :columns="extendedColumns" 
      :data-source="groupedStockData" 
      :pagination="false"
      size="small"
      class="custom-table" 
      :bordered="false"
      :row-class-name="(record: StockRecordType) => record.code === selectedStock?.code ? 'selected-row' : ''"
      :customRow="(record: StockRecordType) => {
          return {
            onClick: () => handleRowClick(record as StockData),
            onContextmenu: (e: MouseEvent) => handleRightClick(e, record as StockData)
          };
        }">
      <template #emptyText>
        <div class="empty-container">暂无股票数据</div>
      </template>
    </Table>
    <!-- 添加右键菜单 -->
    <Dropdown :visible="contextMenuVisible" :trigger="['contextmenu']" @visibleChange="handleContextMenuVisibleChange">
      <template #overlay>
        <a-menu @click="handleMenuClick">
          <a-menu-item key="delete" :disabled="!canDelete">
            <delete-outlined />
            删除 {{ rightClickedStock?.name }}
          </a-menu-item>
        </a-menu>
      </template>
      <div style="position: fixed; width: 1px; height: 1px;" class="context-menu-trigger" />
    </Dropdown>
  </div>
</template>

<style scoped lang="less">
.stock-list-container {
  display: flex;
  flex-direction: column;
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
  flex: 1;
  align-items: center;
  margin-right: 10px;
}

.market-selector {
  display: flex;
  gap: 5px;
  margin-left: 8px;
  
  .active {
    opacity: 1;
  }
  
  .market-button {
    cursor: pointer;
    font-size: 14px;
    padding: 0 5px;
    opacity: 0.6;
    transition: opacity 0.3s;
    
    &:hover {
      opacity: 0.8;
    }
    
    &.active {
      font-weight: bold;
      color: #1890ff;
    }
  }
  
  :deep(.ant-tag) {
    margin-right: 0;
    opacity: 0.6;
    transition: opacity 0.3s;
    
    &:hover {
      opacity: 0.8;
    }
  }
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

.context-menu-trigger {
  position: fixed;
  width: 1px;
  height: 1px;
  background: transparent;
  pointer-events: none;
}
</style>
