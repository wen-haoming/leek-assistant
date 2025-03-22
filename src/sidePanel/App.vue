<template>
  <div class="side-panel">
    <StockList />
    <StockChart :stockInfo="selectedStock" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import StockList from './components/StockList/index.vue';
import StockChart from './components/StockChart/index.vue';

const selectedStock = ref(null);

// 监听股票选择事件
const handleStockSelected = (event) => {
  selectedStock.value = event.detail.stock;
};

onMounted(() => {
  window.addEventListener('stockSelected', handleStockSelected);
});

onUnmounted(() => {
  window.removeEventListener('stockSelected', handleStockSelected);
});
</script>

<style scoped>
.side-panel {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
  background-color: #f5f5f5;
}
</style>
