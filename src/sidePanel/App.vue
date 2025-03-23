<template>
  <div class="side-panel">
    <Tabs style="height: 100%;overflow-y: auto;">
      <Tabs.TabPane tab="股票" key="1">
        <Radio.Group size="small" v-model:value="value1" button-style="outline" class="group-radio">
          <Radio.Button value="1" class="group-radio-item">A股</Radio.Button>
          <Radio.Button value="2" class="group-radio-item">港股</Radio.Button>
          <Radio.Button value="3" class="group-radio-item">美股</Radio.Button>
      </Radio.Group>
      <br/>
      <StockList v-if="value1 === '1'" :marketType="MarketType.A" />
      <StockList v-if="value1 === '2'" :marketType="MarketType.HK" />
      <StockList v-if="value1 === '3'" :marketType="MarketType.US" />
      </Tabs.TabPane>
      <Tabs.TabPane tab="行情" key="2">
        <Market />
      </Tabs.TabPane>
    </Tabs>
    <StockChart />
  </div>
</template>

<script setup lang="ts">
import {Radio, Tabs} from 'ant-design-vue';
import StockList from './components/StockList/index.vue';
import { MarketType } from './api';
import { ref } from 'vue';
import Market from './components/Market/index.vue';
import StockChart from './components/StockChart/index.vue';
const value1 = ref('1');

</script>
<style>
html, body, #app {
  /* width: 100vw;
  height: 100vh; */
}
</style>
<style scoped lang="less">
.side-panel {
  display: flex;
  flex-direction: column;
  height: 100vh;
  justify-content: space-between;
  /* padding: 5px; */
  /* background-color: #f5f5f5; */
  .group-radio {
    width: 100%;display: flex;
    .group-radio-item{
      flex: 1;
      text-align: center;
    }
  }
}
</style>
