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
import { ref, onMounted, watch, onUnmounted, nextTick, defineProps, defineEmits } from 'vue';
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
import { getTrends, getKlineData } from '../../api';

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
  }
});

// 定义emit
const emit = defineEmits(['mounted']);

const chartRef = ref(null);
let chart = null;
const loading = ref(false);
const priceData = ref([]);
const timeData = ref([]);
const selectedStock = ref(null);
// 图表类型：分时、日线、周线、月线、季线
const chartType = ref('timeline');
// K线图数据格式 [open, close, lowest, highest]
const klineData = ref([]);

// 监听股票选择事件（保留原有功能，以兼容现有代码）
const handleStockSelected = (event) => {
  if (!props.stockInfo) { // 如果没有通过props传递stockInfo，才使用事件
    selectedStock.value = event.detail.stock;
  }
};

// 初始化设置，优先使用props
const setupStockInfo = () => {
  if (props.stockInfo) {
    selectedStock.value = props.stockInfo;
  }
};

onMounted(() => {
  window.addEventListener('stockSelected', handleStockSelected);
  setupStockInfo();
  emit('mounted');
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
    // 优先使用props传入的secid，如果没有则使用股票代码生成
    const secid = props.secid || `${selectedStock.value.code.startsWith('6') ? '1.' : '0.'}${selectedStock.value.code}`;
    
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
}
;

// 加载分时数据
const loadTrendsData = async (secid) => {
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
    klineData.value = []; // 清空K线数据
    
    updateChart();
  }
};

// 加载K线数据（模拟数据，实际项目中应替换为真实API调用）
const loadKlineData = async (secid: string) => {
    try {
        // 根据图表类型选择对应的 klt 参数
        const kltMap = {
            'day': 101,    // 日线
            'week': 102,   // 周线
            'month': 103,  // 月线
            'quarter': 104 // 季线
        };
        
        const klt = kltMap[chartType.value] || 101;
        const response = await getKlineData(secid, klt);
        
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

// // 修改 loadMoreHistoricalData 函数
// const loadMoreHistoricalData = async (secid: string) => {
//     // 由于东方财富的接口已经一次性返回足够多的历史数据
//     // 这里可以不需要实现加载更多的逻辑
//     return;
// };

// 获取工作日（排除周末）
const getBussinessDay = (startDate, offset) => {
  let date = startDate.clone();
  let count = 0;
  
  while (count < offset) {
    date = date.subtract(1, 'day');
    // 跳过周末 (0是周日，6是周六)
    if (date.day() !== 0 && date.day() !== 6) {
      count++;
    }
  }
  
  return date;
};

// 获取周线日期（每周五）
const getWeeklyDate = (startDate, weekOffset) => {
  // 从当前日期找到最近的周五
  let date = startDate.clone();
  while (date.day() !== 5) { // 5 代表周五
    date = date.subtract(1, 'day');
  }
  
  // 然后再减去指定的周数
  return date.subtract(weekOffset, 'week');
};

// 加载更多历史数据
const loadMoreHistoricalData = async (secid) => {
  // 避免重复加载
  if (loading.value) return;
  
  loading.value = true;
  
  try {
    // 这里应该调用实际的API获取更早的历史数据
    // 由于使用模拟数据，这里模拟添加更多历史数据
    
    const additionalCount = {
      'day': 60,     // 额外3个月
      'week': 12,    // 额外3个月
      'month': 12,   // 额外1年
      'quarter': 4   // 额外1年
    }[chartType.value] || 60;
    
    const times = [...timeData.value];
    const data = [...klineData.value];
    
    // 获取当前最早的日期
    const earliestDate = dayjs(times[0], chartType.value === 'month' ? 'YYYY-MM' : 
                                         chartType.value === 'quarter' ? 'YYYY-[Q]Q' : 'YYYY-MM-DD');
    
    for (let i = 1; i <= additionalCount; i++) {
      let date;
      let dateFormat;
      
      switch(chartType.value) {
        case 'day':
          date = getBussinessDay(earliestDate, i);
          dateFormat = 'YYYY-MM-DD';
          break;
        case 'week':
          date = earliestDate.subtract(i, 'week');
          while (date.day() !== 5) { // 确保是周五
            date = date.subtract(1, 'day');
          }
          dateFormat = 'YYYY-MM-DD';
          break;
        case 'month':
          date = earliestDate.subtract(i, 'month').endOf('month');
          dateFormat = 'YYYY-MM';
          break;
        case 'quarter':
          let quarterOffset = i * 3;
          date = earliestDate.subtract(quarterOffset, 'month');
          date = dayjs(date.format('YYYY-') + [3, 6, 9, 12][Math.floor(date.month() / 3)] + '-01').endOf('month');
          dateFormat = 'YYYY-[Q]Q';
          break;
        default:
          date = getBussinessDay(earliestDate, i);
          dateFormat = 'YYYY-MM-DD';
      }
      
      times.unshift(date.format(dateFormat));
      
      // 生成连贯的K线数据，与前面的数据有连续性
      const lastData = data[0];
      const lastClose = lastData[1]; // 前一个周期的收盘价
      
      // 基于前一周期收盘价生成新数据
      const volatility = lastClose * 0.03; // 波动范围为前收盘价的3%
      const open = parseFloat((lastClose + (Math.random() - 0.5) * volatility).toFixed(2));
      const close = parseFloat((open + (Math.random() - 0.5) * volatility).toFixed(2));
      const highest = parseFloat(Math.max(open, close, open + Math.random() * volatility/2).toFixed(2));
      const lowest = parseFloat(Math.min(open, close, close - Math.random() * volatility/2).toFixed(2));
      
      data.unshift([open, close, lowest, highest]);
    }
    
    // 更新数据
    timeData.value = times;
    klineData.value = data;
    
    // 保持当前缩放和滚动位置
    let zoomSize = 0;
    if (chart.getOption().dataZoom[0]) {
      zoomSize = chart.getOption().dataZoom[0].end - chart.getOption().dataZoom[0].start;
    }
    
    // 更新图表，并设置新的缩放位置
    updateChart();
    
    // 调整缩放位置，将新加载的数据考虑在内
    const newEndPosition = (timeData.value.length - additionalCount) / timeData.value.length * 100;
    const newStartPosition = Math.max(0, newEndPosition - zoomSize);
    
    chart.dispatchAction({
      type: 'dataZoom',
      start: newStartPosition,
      end: newEndPosition
    });
    
  } catch (error) {
    console.error('加载更多历史数据失败:', error);
  } finally {
    loading.value = false;
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
