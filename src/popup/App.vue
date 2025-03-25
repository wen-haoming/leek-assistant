<template>
  <ConfigProvider
    :theme="{
        token: {
          colorPrimary: '#597ef7',
        }
    }"
  >
    <div class="popup-container">
      <div class="left-panel">
          <div class="left-panel-button-group">
            <Button 
              :type="value1 === '1' ? 'primary' : 'default'" 
              size="small" 
              @click="()=>{value1='1'}"
              class="nav-button"
            >
              <template #icon>
                <StockOutlined />
              </template>
            </Button>
            <Button 
              :type="value1 === '2' ? 'primary' : 'default'" 
              size="small" 
              @click="()=>{value1='2'}"
              class="nav-button"
            >
              <template #icon>
                <LineChartOutlined />
              </template>
            </Button>
          </div>
      </div>
      <div class="content">
        <StockList v-if="value1 === '1'" :canDelete="true" />
        <Market v-if="value1 === '2'" />
      </div>
    </div>
  </ConfigProvider>
</template>

<script setup lang="ts">
import {ConfigProvider, Button} from 'ant-design-vue';
import StockList from './components/StockList/index.vue';
import Market from './components/Market/index.vue';
import { LineChartOutlined, StockOutlined } from '@ant-design/icons-vue';
import { ref } from 'vue';

const value1 = ref('1');
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
  width: 350px;
  padding:10px 10px 10px 0;
  .left-panel{
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    width:40px;
    border-right: 1px solid #f0f0f0; 
    .left-panel-button-group{
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
      width:100%;
      
      .nav-button {
        width: 32px;
        height: 32px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        
        :deep(.anticon) {
          font-size: 16px;
        }
      }
    }
  }
  .content{
    flex:1;
    padding-left: 10px;
  }
}
</style>

<style lang="less">
 .group-radio {
    width: 100%;
    display: flex;
    .group-radio-item {
      flex: 1;
      text-align: center;
    }
  }</style>
