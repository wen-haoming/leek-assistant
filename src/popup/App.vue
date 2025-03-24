<template>
  <ConfigProvider
    :theme="{
        token: {
          colorPrimary: '#597ef7',
        }
    }"
  >
    <div class="popup-container">
      <Tabs
        type="card"
        size="small"
        style="height: 100%;"
        v-model:activeKey="activeKey"
        @change="handleTabChange"
      >
        <Tabs.TabPane tab="股票" key="1">
          <Radio.Group size="small" v-model:value="value1" button-style="solid" class="group-radio">
            <Radio.Button value="1" class="group-radio-item">A股</Radio.Button>
            <Radio.Button value="2" class="group-radio-item">港股</Radio.Button>
            <Radio.Button value="3" class="group-radio-item">美股</Radio.Button>
          </Radio.Group>
          <br/>
          <StockList v-if="value1 === '1'" :marketType="MarketType.A" :canDelete="activeKey === '1'" />
          <StockList v-if="value1 === '2'" :marketType="MarketType.HK" :canDelete="activeKey === '1'" />
          <StockList v-if="value1 === '3'" :marketType="MarketType.US" :canDelete="activeKey === '1'" />
        </Tabs.TabPane>
        <Tabs.TabPane tab="行情" key="2">
          <Market />
        </Tabs.TabPane>
      </Tabs>
      <StockChart :marketType="currentMarketType" />
    </div>
  </ConfigProvider>
</template>

<script setup lang="ts">
import {Radio, Tabs, ConfigProvider} from 'ant-design-vue';
import StockList from './components/StockList/index.vue';
import Market from './components/Market/index.vue';
import StockChart from './components/StockChart/index.vue';
import { MarketType } from './api';
import { ref, computed } from 'vue';

const value1 = ref('1');
const activeKey = ref('1');

// 处理标签页切换
const handleTabChange = (key: string) => {
  activeKey.value = key;
};

// 根据选择的值计算当前市场类型
const currentMarketType = computed(() => {
  switch (value1.value) {
    case '1': return MarketType.A;
    case '2': return MarketType.HK;
    case '3': return MarketType.US;
    default: return MarketType.A;
  }
});
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
}
</style>

<style scoped lang="less">
.popup-container {
  display: flex;
  flex-direction: column;
  width: 300px;
  height: 400px;
  justify-content: space-between;
  padding: 10px;
  
  .group-radio {
    width: 100%;
    display: flex;
    .group-radio-item {
      flex: 1;
      text-align: center;
    }
  }
}
</style>
