<template>
  <div class="side-panel">
    <Radio.Group size="small" v-model:value="value1" button-style="outline" class="group-radio">
          <Radio.Button value="1" class="group-radio-item">A股</Radio.Button>
          <Radio.Button value="2" class="group-radio-item">港股</Radio.Button>
          <Radio.Button value="3" class="group-radio-item">美股</Radio.Button>
      </Radio.Group>
      <br/>
      <StockList v-if="value1 === '1'" :marketType="MarketType.A" />
      <StockList v-if="value1 === '2'" :marketType="MarketType.HK" />
      <StockList v-if="value1 === '3'" :marketType="MarketType.US" />
  </div>
</template>

<script setup lang="ts">
import {Radio} from 'ant-design-vue';
import StockList from './components/StockList/index.vue';
import { MarketType } from './api';
import { ref } from 'vue';
const value1 = ref('1');

</script>

<style scoped lang="less">
.side-panel {
  /* padding: 5px; */
  height: 100%;
  overflow-y: auto;
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
