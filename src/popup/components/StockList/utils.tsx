import { Tag } from "ant-design-vue";
import { MarketType } from "../../api";

// 获取市场标签名称
const getMarketLabel = (marketType: MarketType) => {
  switch (marketType) {
    case MarketType.A:
      return '';
    case MarketType.HK:
      return '港';
    case MarketType.US:
      return '美';
    default:
      return '?';
  }
};

// 获取市场标签颜色
const getMarketColor = (marketType: MarketType) => {
  switch (marketType) {
    case MarketType.A:
      return '';
    case MarketType.HK:
      // purple
      return '#722ed1';
    case MarketType.US:
      // cyan
      return '#13c2c2';
    default:
      return 'default';
  }
};

interface StockRecord {
  name: string;
  code: string;
  price: string | number;
  change: string | number;
  market?: MarketType;
  [key: string]: any;
}

// 定义表格列
export const columns = [
  {
    title: '股票名称',
    key: 'name',
    dataIndex: 'name',
    width: '50%',
    customRender: ({ record }: { record: StockRecord }) => (
      <div style="display:flex;align-items:center;font-size:12px;flex-wrap:wrap">
        <div class="stock-title">{record.name}</div>
        <span style="margin:0 5px">|</span>
        <div class="stock-code">{record.code}</div>
        {record.market && record.market !== MarketType.A && (
          <span 
          style={{
            color:getMarketColor(record.market)
          }}
          >
            {getMarketLabel(record.market)}
          </span>
        )}
      </div>
    )
  },
  {
    title: '涨跌幅',
    key: 'change',
    dataIndex: 'change',
    align: 'center',
    customRender: ({ text }: { text: string | number }) => {
      const value = parseFloat(text.toString());
      const style = {
        color: value >= 0 ? '#f5222d' : '#52c41a',
        fontWeight: 500,
        fontSize: '14px'
      };
      return (
        <span style={style}>
          {value >= 0 ? '+' : ''}{text}%
        </span>
      );
    }
  },
  {
    title: '价格',
    key: 'price',
    dataIndex: 'price',
    align: 'right'
  }
];
