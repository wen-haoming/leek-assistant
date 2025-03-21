<template>
  <div class="side-panel bg-red w-100% h-100%" >
    <Layoyt />
  </div>
</template>

<script setup lang="ts">
import Layoyt from './Layoyt.vue'

</script>

<style scoped>

.current-tab {
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.proxy-settings {
  margin-bottom: 20px;
}

.requests {
  max-height: 500px;
  overflow-y: auto;
}

.request-item {
  padding: 10px;
  margin-bottom: 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.request-item p {
  margin: 5px 0;
  font-size: 14px;
}

hr {
  border: none;
  border-top: 1px solid #eee;
  margin: 10px 0;
}
</style>
