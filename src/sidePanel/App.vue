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


</script>

<style scoped>
.side-panel {
  /* padding: 5px; */
  height: 100%;
  overflow-y: auto;
  /* background-color: #f5f5f5; */
}
</style>
