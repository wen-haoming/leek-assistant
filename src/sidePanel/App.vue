<template>
  <div class="side-panel">
    <h1>Chrome Extension Side Panel</h1>
    <div class="content">
      <div class="current-tab">
        <h3>当前标签页信息：</h3>
        <p>域名：{{ currentDomain }}</p>
      </div>
      <div class="requests">
        <h3>请求记录：</h3>
        <div v-for="(request, index) in requests" :key="index" class="request-item">
          <p>URL: {{ request.url }}</p>
          <p>Method: {{ request.method }}</p>
          <p>Type: {{ request.type }}</p>
          <hr>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const currentDomain = ref('')
const requests = ref<chrome.webRequest.WebRequestDetails[]>([])
console.log(chrome,'chrome');

// 获取当前标签页信息
const getCurrentTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab.url) {
    const url = new URL(tab.url)
    currentDomain.value = url.hostname
  }
}

// 监听标签页变化
chrome.tabs.onActivated.addListener(() => {
  getCurrentTab()
})

// 监听 URL 变化
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    getCurrentTab()
  }
})

// 监听网络请求
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    requests.value.unshift(details)
    // 只保留最近的 50 条记录
    if (requests.value.length > 50) {
      requests.value.pop()
    }
  },
  { urls: ['<all_urls>'] }
)

onMounted(() => {
  getCurrentTab()
})
</script>

<style scoped>
.side-panel {
  padding: 16px;
}

.content {
  margin-top: 16px;
}

.current-tab {
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
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
