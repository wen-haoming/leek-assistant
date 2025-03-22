<template>
  <div class="stock-chart-container">
    <div v-if="!selectedStock" class="empty-chart">
      请选择一个股票查看分时图
    </div>
    <div v-else>
      <!-- 保持现有的头部信息 -->
      <div class="chart-header">
        <div class="stock-info">
          <div class="stock-name">{{ selectedStock.name }}</div>
          <div class="stock-code">{{ selectedStock.code }}</div>
        </div>
        <div class="stock-price">
          <div class="current-price">{{ selectedStock.price }}</div>
          <div 
            class="price-change" 
            :class="parseFloat(selectedStock.change) >= 0 ? 'up' : 'down'"
          >
            {{ parseFloat(selectedStock.change) >= 0 ? '+' : '' }}{{ selectedStock.change }}%
          </div>
        </div>
      </div>
      <a-spin :spinning="loading">
        <div ref="chartRef" class="chart-container"></div>
      </a-spin>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import dayjs from 'dayjs';
import { Spin as ASpin } from 'ant-design-vue';
import { 
  GridComponent, 
  TooltipComponent, 
  TitleComponent,
  DataZoomComponent,
  MarkLineComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { getTrends } from '../../api';



// 注册必要的组件
echarts.use([
  LineChart,
  GridComponent, 
  TooltipComponent, 
  TitleComponent, 
  DataZoomComponent,
  MarkLineComponent,
  CanvasRenderer
]);

// stockInfo

const chartRef = ref(null);
let chart = null;
const loading = ref(false);
const priceData = ref([]);
const timeData = ref([]);
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

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return;
  
  // 确保DOM元素已经渲染完成
  setTimeout(() => {
    if (chart) {
      chart.dispose();
    }
    
    chart = echarts.init(chartRef.value);
    
    // 设置基本配置
    const option = {
      // 不显示标题
      title: {
        show: false
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: function(params) {
          const data = params[0];
          return `
            时间: ${data.axisValue}<br/>
            价格: ${data.data.toFixed(2)}<br/>
          `;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        top: '5%',  // 修改这里，减少顶部空间
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: timeData.value,
        boundaryGap: false,
        axisLine: { onZero: false },
        axisLabel: {
          formatter: function(value) {
            // 确保只显示时间部分 (HH:MM)
            if (value && value.includes(':')) {
              return dayjs(value).format('HH:mm')
            } else if (value && value.length === 4) {
              // 如果是4位数字格式 (HHMM)，转换为 HH:MM
              return `${value.substring(0, 2)}:${value.substring(2, 4)}`;
            }
            return value;
          },
          interval: function(index, value) {
            // 根据索引显示关键时间点，确保即使格式不完全匹配也能显示
            // 交易时间通常为9:30-11:30, 13:00-15:00
            // 按照大约每小时显示一个刻度
            const totalPoints = timeData.value.length;
            if (totalPoints <= 10) return true; // 如果点数较少，全部显示
            
            // 计算关键点的索引位置
            const openIndex = 0; // 开盘 9:30
            const midMorningIndex = Math.floor(totalPoints * 0.15); // 10:30左右
            const morningCloseIndex = Math.floor(totalPoints * 0.3); // 11:30左右
            const afternoonOpenIndex = Math.floor(totalPoints * 0.5); // 13:00左右
            const midAfternoonIndex = Math.floor(totalPoints * 0.7); // 14:00左右
            const closeIndex = totalPoints - 1; // 收盘 15:00
            
            return index === openIndex || 
                   index === midMorningIndex || 
                   index === morningCloseIndex || 
                   index === afternoonOpenIndex || 
                   index === midAfternoonIndex || 
                   index === closeIndex;
          }
        }
      },
      yAxis: {
        type: 'value',
        scale: true,
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed'
          }
        },
        axisLabel: {
          formatter: '{value}'
        }
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
        }
        // 移除了底部的slider拖拽控件
      ],
      series: [
        {
          name: '价格',
          type: 'line',
          smooth: true,
          symbol: 'none',
          sampling: 'average',
          itemStyle: {
            color: '#1890ff'
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
              { offset: 1, color: 'rgba(24, 144, 255, 0.1)' }
            ])
          },
          data: priceData.value,
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: {
              color: '#999',
              type: 'dashed'
            },
            data: [
              { 
                yAxis: 'average',
                name: '平均值'
              }
            ]
          }
        }
      ]
    };
    
    chart.setOption(option);
    
    // 如果已有数据，立即更新图表
    if (priceData.value.length > 0) {
      updateChart();
    }
  }, 100);
  
  // 响应窗口大小变化
  window.addEventListener('resize', handleResize);
};

// 处理窗口大小变化
const handleResize = () => {
  chart && chart.resize();
};

// 加载分时数据
const loadTrendsData = async () => {
  if (!selectedStock.value) return;
  
  loading.value = true;
  try {
    const secid = `${selectedStock.value.code.startsWith('6') ? '1.' : '0.'}${selectedStock.value.code}`;
    const response = await getTrends(secid);
    
    if (response?.data?.trends) {
      const preClose = response.data.preClose || 0;
      const trends = response.data.trends;
      
      // 处理数据为时间和价格数组
      const times = [];
      const prices = [];
      
      trends.forEach((item) => {
        const [time, price] = item.split(',');
        // 正确格式化时间 09:30
        const formattedTime = time.length === 4 ? 
          `${time.substring(0, 2)}:${time.substring(2, 4)}` : 
          time;
        const priceValue = parseFloat(price);
        
        times.push(formattedTime);
        prices.push(priceValue);
      });
      
      timeData.value = times;
      priceData.value = prices;
      
      updateChart();
    }
  } catch (error) {
    console.error('加载分时数据失败:', error);
  } finally {
    loading.value = false;
  }
};

// 更新图表数据
const updateChart = () => {
  if (!chart || priceData.value.length === 0) return;
  
  // 计算基准线（昨日收盘价）
  const preClose = selectedStock.value && selectedStock.value.price ? 
    (parseFloat(selectedStock.value.price) / (1 + parseFloat(selectedStock.value.change) / 100)).toFixed(2) : 0;
  
  chart.setOption({
    title: {
      text: selectedStock.value ? `${selectedStock.value.name} (${selectedStock.value.code})` : '股票分时图'
    },
    xAxis: {
      data: timeData.value
    },
    series: [
      {
        data: priceData.value,
        markLine: {
          data: [
            { 
              yAxis: preClose,
              name: '昨收价'
            }
          ]
        }
      }
    ]
  });
};

// 监听股票信息变化
watch(() => selectedStock.value, (newVal) => {
  if (newVal) {
    // 确保图表已初始化
    if (!chart && chartRef.value) {
      initChart();
    }
    loadTrendsData();
  } else {
    priceData.value = [];
    timeData.value = [];
    if (chart) {
      updateChart();
    }
  }
}, { deep: true, immediate: true });

onMounted(() => {
  // 延迟初始化图表，确保DOM已渲染
  nextTick(() => {
    initChart();
    if (selectedStock.value) {
      loadTrendsData();
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chart && chart.dispose();
});
</script>

<style scoped>
.stock-chart-container {
  margin-top: 16px;
  padding: 5px;
  background-color: #fff;
  border-radius: 8px;
  position: relative;
}

.empty-chart {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.stock-info {
  display: flex;
  align-items: baseline;
}

.stock-name {
  font-size: 16px;
  font-weight: 500;
  margin-right: 8px;
}

.stock-code {
  font-size: 12px;
  color: #999;
}

.stock-price {
  display: flex;
  align-items: baseline;
}

.current-price {
  font-size: 18px;
  font-weight: 500;
  margin-right: 8px;
}

.price-change {
  font-size: 14px;
}

.up {
  color: #ec0000;
}

.down {
  color: #00da3c;
}

.chart-container {
  height: 400px;
  width: 100%;
}
</style>
