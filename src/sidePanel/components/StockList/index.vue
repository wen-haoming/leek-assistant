<script lang="tsx" setup>
import { Button, Table, AutoComplete, Input } from "ant-design-vue"
import { onMounted, ref, watch } from "vue"
import { getStockDetails, getStockDetail } from "../../api"
import { columns } from './utils';

// 定义股票数据的响应式引用
const stockData = ref([]);
const loading = ref(false);
const searchValue = ref('');
const searchOptions = ref([]);
const searchLoading = ref(false);
// 选中的股票
const selectedStock = ref(null);

// 已添加的股票代码列表
const addedStockCodes = ref(['0.000725', '1.600036', '0.000001', '0.000858', '1.601318']);



// 实现搜索股票的函数
const searchStock = async (keyword) => {
  if (!keyword) {
    searchOptions.value = [];
    return;
  }

  searchLoading.value = true;
  try {
    // 尝试直接获取股票详情
    const detail = await getStockDetail(`1.${keyword}`);
    if (!detail?.data) {
      // 如果沪市没有，尝试深市
      detail = await getStockDetail(`0.${keyword}`);
    }

    if (detail?.data) {
      const { f57: code, f58: name, f43: price, f170: change } = detail.data;
      searchOptions.value = [{
        value: `${code.startsWith('6') ? '1.' : '0.'}${code}`,
        label: `${name} (${code}) ${price.toFixed(2)} ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
        code,
        name,
        price: price.toFixed(2),
        change: change.toFixed(2)
      }];
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

// 监听搜索值变化
watch(searchValue, (newValue) => {
  searchStock(newValue);
});

// 处理选择股票
const handleSelectStock = (value, option) => {
  // 检查是否已经添加过该股票
  if (!addedStockCodes.value.includes(value)) {
    addedStockCodes.value.push(value);
    loadStockData();
  }
  searchValue.value = ''; // 清空搜索框
};

// 处理表格行点击事件
const handleRowClick = (record) => {
  selectedStock.value = record;
  // 发送事件通知父组件
  const event = new CustomEvent('stockSelected', {
    detail: {
      stock: record,
      secid: `${record.code.startsWith('6') ? '1.' : '0.'}${record.code}`
    }
  });
  window.dispatchEvent(event);
};

// 加载股票数据
const loadStockData = async () => {
  loading.value = true;
  try {
    const stockList = addedStockCodes.value;
    const response = await getStockDetails(stockList);
    // 处理返回的数据，转换为表格需要的格式
    stockData.value = response?.data?.diff.map(item => ({
      code: item.f12,
      name: item.f14,
      price: typeof item.f2 === 'number' ? item.f2.toFixed(2) : item.f2,
      change: typeof item.f3 === 'number' ? item.f3.toFixed(2) : item.f3,
      pe: typeof item.f9 === 'number' ? item.f9.toFixed(2) : item.f9,
    })) || [];
  } catch (error) {
    console.error('加载股票数据失败:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadStockData();
})
</script>

<template>
  <div class="stock-list-container">
    <div class="header">
      <div class="search-container">
        <AutoComplete v-model:value="searchValue" :options="searchOptions" :dropdown-match-select-width="280"
          style="width: 200px" placeholder="搜索股票" @select="handleSelectStock" :loading="searchLoading">
          <template #default>
            <Input size="small" />
          </template>
        </AutoComplete>
      </div>
      <Button type="primary" size="small" @click="loadStockData" :loading="loading">刷新</Button>
    </div>
    <Table 
    :showHeader="false"
    :columns="columns" :data-source="stockData" :loading="loading" :pagination="false" size="small"
      class="custom-table" :row-class-name="(record) => record.code === selectedStock?.code ? 'selected-row' : ''"
      :customRow="(record) => {
          return {
            onClick: () => handleRowClick(record)
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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
  border-radius: 6px;
  overflow: hidden;
  :deep(.ant-table.ant-table-small){
    .ant-table-cell{
      padding:2px;
    }
  }
}

:deep(.ant-table) {
  border-radius: 6px;
  border: 1px solid #f0f0f0;
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
