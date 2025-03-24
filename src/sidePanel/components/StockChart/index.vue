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
      <!-- 添加图表类型切换 -->
      <div class="chart-type-selector">
        <a-radio-group v-model:value="chartType" button-style="solid" size="small">
          <a-radio-button value="timeline">分时</a-radio-button>
          <a-radio-button value="day">日线</a-radio-button>
          <a-radio-button value="week">周线</a-radio-button>
          <a-radio-button value="month">月线</a-radio-button>
          <a-radio-button value="quarter">季线</a-radio-button>
        </a-radio-group>
      </div>
      <a-spin :spinning="loading">
        <div ref="chartRef" class="chart-container"></div>
      </a-spin>
    </div>
  </div>
</template>
<script setup lang="ts">
// 添加导入
import { ref, onMounted, watch, onUnmounted, nextTick, defineProps, defineEmits,computed } from 'vue';
import * as echarts from 'echarts/core';
import { LineChart, CandlestickChart } from 'echarts/charts';
import dayjs from 'dayjs';
import { Spin as ASpin, Radio as ARadio } from 'ant-design-vue';
import { 
  GridComponent, 
  TooltipComponent, 
  TitleComponent,
  DataZoomComponent,
  MarkLineComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { MarketType, getTrends, getKlineData, getMarketPrefix } from '../../api';
import { useGlobalState } from "../../store";

// 注册必要的组件
echarts.use([
  LineChart,
  CandlestickChart,
  GridComponent, 
  TooltipComponent, 
  TitleComponent, 
  DataZoomComponent,
  MarkLineComponent,
  CanvasRenderer
]);

// 定义props
const props = defineProps({
  stockInfo: {
    type: Object,
    default: null
  },
  secid: {
    type: String,
    default: ''
  },
  marketType: {
    type: String,
    default: MarketType.A
  }
});

// 定义emit
const emit = defineEmits(['mounted']);

const chartRef = ref(null);
let chart = null;
const loading = ref(false);
const priceData = ref([]);
const timeData = ref([]);
// 图表类型：分时、日线、周线、月线、季线
const chartType = ref('timeline');
// K线图数据格式 [open, close, lowest, highest]
const klineData = ref([]);

// 获取全局状态
const { selectedStock: globalSelectedStock } = useGlobalState();

// 移除原有的事件监听相关代码
// const handleStockSelected = (event) => { ... }

// 使用计算属性监听全局选中的股票
const selectedStock = computed(() => {
  // 如果有 props.stockInfo，优先使用 props
  if (props.stockInfo) {
    return props.stockInfo;
  }
  return globalSelectedStock.value;
});

// 监听选中股票变化
watch(() => selectedStock.value, (newStock) => {
  if (newStock) {
    // 确保图表已初始化
    if (!chart && chartRef.value) {
      initChart();
    }
    loadChartData();
  } else {
    priceData.value = [];
    timeData.value = [];
    klineData.value = [];
    if (chart) {
      updateChart();
    }
  }
}, { immediate: true });

// 移除原有的 onMounted 和 onUnmounted 中的事件监听
onMounted(() => {
  // 移除 window.addEventListener('stockSelected', handleStockSelected);
  // setupStockInfo();
  nextTick(() => {
    initChart();
    if (selectedStock.value) {
      loadChartData();
    }
  });
  emit('mounted');
});

onUnmounted(() => {
  // 移除 window.removeEventListener('stockSelected', handleStockSelected);
  window.removeEventListener('resize', handleResize);
  chart && chart.dispose();
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
    const option = getChartOption();
    
    chart.setOption(option);
    
    // 如果已有数据，立即更新图表
    if (priceData.value.length > 0 || klineData.value.length > 0) {
      updateChart();
    }
  }, 100);
  
  // 响应窗口大小变化
  window.addEventListener('resize', handleResize);
};

// 获取图表配置，根据图表类型返回不同的配置
const getChartOption = () => {
  // 基础配置
  const baseOption = {
    title: {
      show: false
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      top: '5%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: timeData.value,
      boundaryGap: false,
      axisLine: { onZero: false }
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
    ]
  };
  
  // 根据图表类型返回不同的配置
  if (chartType.value === 'timeline') {
    // 分时图配置
    baseOption.tooltip.formatter = function(params) {
      const data = params[0];
      return `
        时间: ${data.axisValue}<br/>
        价格: ${data.data.toFixed(2)}<br/>
      `;
    };
    
    baseOption.xAxis.axisLabel = {
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
    };
    
    baseOption.series = [
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
    ];
  } else {
    // K线图配置
    baseOption.tooltip.formatter = function(params) {
      const data = params[0].data;
      return `
        日期: ${params[0].axisValue}<br/>
        开盘: ${data[0].toFixed(2)}<br/>
        收盘: ${data[1].toFixed(2)}<br/>
        最低: ${data[2].toFixed(2)}<br/>
        最高: ${data[3].toFixed(2)}<br/>
      `;
    };
    
    baseOption.xAxis.boundaryGap = true;
    
    // 为K线图添加底部的日期区间滑块
    baseOption.dataZoom = [
      {
        type: 'inside',
        start: 0,
        end: 100,
        xAxisIndex: 0
      },
      {
        type: 'slider',
        show: true,
        xAxisIndex: 0,
        bottom: '2%',
        height: 20,
        start: 0,
        end: 100,
        borderColor: '#ccc',
        fillerColor: 'rgba(24, 144, 255, 0.2)',
        handleIcon: 'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
        handleSize: '80%',
        handleStyle: {
          color: '#1890ff',
          shadowBlur: 3,
          shadowColor: 'rgba(0, 0, 0, 0.6)',
          shadowOffsetX: 2,
          shadowOffsetY: 2
        },
        textStyle: {
          color: '#999'
        }
      }
    ];
    
    baseOption.series = [
      {
        name: 'K线',
        type: 'candlestick',
        data: klineData.value,
        itemStyle: {
          color: '#ec0000', // 上涨颜色（红色）
          color0: '#00da3c', // 下跌颜色（绿色）
          borderColor: '#ec0000',
          borderColor0: '#00da3c'
        }
      }
    ];
  }
  
  return baseOption;
};

// 处理窗口大小变化
const handleResize = () => {
  chart && chart.resize();
};

// 加载图表数据
const loadChartData = async () => {
  if (!selectedStock.value) return;
  
  loading.value = true;
  try {
    // 根据市场类型和股票代码生成正确的 secid
    let secid = props.secid;
    if (!secid) {
      // 如果没有传入 secid，则根据市场类型和股票代码生成
      const prefix = getMarketPrefix(props.marketType, selectedStock.value.code);
      secid = `${prefix}${selectedStock.value.code}`;
    }
    
    if (chartType.value === 'timeline') {
      // 加载分时数据
      await loadTrendsData(secid);
    } else {
      // 加载K线数据
      await loadKlineData(secid);
    }
  } catch (error) {
    console.error('加载图表数据失败:', error);
  } finally {
    loading.value = false;
  }
};

// 修改 loadTrendsData 函数，添加市场相关参数
const loadTrendsData = async (secid) => {
  // 根据不同市场类型可能需要添加不同的参数
  const marketParams = {};
  
  // 对于港股和美股，可能需要特殊处理
  if (props.marketType === MarketType.HK || props.marketType === MarketType.US) {
    marketParams.iscr = '1'; // 国际市场
  }
  
  const response = await getTrends(secid, marketParams);
  
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
    klineData.value = []; // 清空K线数据
    
    updateChart();
  }
};

// 修改 loadKlineData 函数，添加市场相关参数
const loadKlineData = async (secid) => {
  try {
    // 根据图表类型选择对应的 klt 参数
    const kltMap = {
      'day': 101,    // 日线
      'week': 102,   // 周线
      'month': 103,  // 月线
      'quarter': 104 // 季线
    };
    
    const klt = kltMap[chartType.value] || 101;
    
    // 添加市场相关参数
    const marketParams = {};
    if (props.marketType === MarketType.HK || props.marketType === MarketType.US) {
      marketParams.iscr = '1'; // 国际市场
    }
    
    const response = await getKlineData(secid, klt, 1, marketParams);
    
    if (response?.data?.klines) {
      const klines = response.data.klines;
      const times = [];
      const data = [];
      
      klines.forEach(item => {
        const [time, open, close, highest, lowest] = item.split(',');
        times.push(time);
        data.push([
          parseFloat(open),
          parseFloat(close),
          parseFloat(lowest),
          parseFloat(highest)
        ]);
      });
      
      timeData.value = times;
      priceData.value = []; // 清空分时数据
      klineData.value = data;
      
      updateChart();
    }
  } catch (error) {
    console.error('加载K线数据失败:', error);
  }
};



// 更新图表数据
const updateChart = () => {
  if (!chart) return;
  
  // 更新图表配置
  if (chartType.value === 'timeline') {
    // 分时图更新
    if (priceData.value.length === 0) return;
    
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
  } else {
    // K线图更新
    if (klineData.value.length === 0) return;
    
    chart.setOption({
      title: {
        text: selectedStock.value ? 
          `${selectedStock.value.name} (${selectedStock.value.code}) ${getChartTypeText()}` : 
          `股票${getChartTypeText()}`
      },
      xAxis: {
        data: timeData.value
      },
      series: [
        {
          data: klineData.value
        }
      ]
    });
  }
};

// 获取图表类型文本
const getChartTypeText = () => {
  const typeTexts = {
    'timeline': '分时图',
    'day': '日K线',
    'week': '周K线',
    'month': '月K线',
    'quarter': '季K线'
  };
  return typeTexts[chartType.value] || '';
};

// 监听图表类型变化
watch(() => chartType.value, (newType) => {
  if (selectedStock.value) {
    // 重新初始化图表
    initChart();
    // 加载对应类型的数据
    loadChartData();
  }
});

// 监听股票信息变化（包括props传入的stockInfo）
watch([() => selectedStock.value, () => props.stockInfo], ([newSelectedStock, newStockInfo]) => {
  if (newStockInfo && !selectedStock.value) {
    selectedStock.value = newStockInfo;
  }
  
  if (selectedStock.value) {
    // 确保图表已初始化
    if (!chart && chartRef.value) {
      initChart();
    }
    loadChartData();
  } else {
    priceData.value = [];
    timeData.value = [];
    klineData.value = [];
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
      loadChartData();
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
  margin: 16px 0;
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

.chart-type-selector {
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
