// 定义表格列
 export const columns = [
  {
    title: '股票名称',
    key: 'name',
    dataIndex: 'name',
    width: '50%',
    customRender: ({ record }) => (
      <div style="display:flex;align-items:center;font-size:12px">
        <div class="stock-title">{record.name}</div>
        <span style="margin:0 5px">|</span>
        <div class="stock-code" >{record.code}</div>
      </div>
    )
  },
  {
    title: '涨跌幅',
    key: 'change',
    dataIndex: 'change',
    align: 'center',
    customRender: ({ text }) => {
      const value = parseFloat(text);
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
