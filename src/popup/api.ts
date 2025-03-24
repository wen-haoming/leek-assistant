interface TrendsResponse {
    rc: number;
    rt: number;
    svr: number;
    lt: number;
    full: number;
    dlmkts: string;
    data: {
        code: string;
        market: number;
        type: number;
        status: number;
        name: string;
        decimal: number;
        preSettlement: number;
        preClose: number;
        beticks: string;
        trendsTotal: number;
        time: number;
        kind: number;
        prePrice: number;
        tradePeriods: {
            pre: {
                b: number;
                e: number;
            };
            after: null | any;
            periods: Array<{
                b: number;
                e: number;
            }>;
        };
        trends: string[];
    };
}

async function request<T>(url: string, queryParams?: Record<string, string>): Promise<T> {
    const queryString = queryParams ? '?' + new URLSearchParams(queryParams).toString() : '';
    const response = await fetch(url + queryString, {
        mode: 'cors',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    return response.json();
}

export function getTrends(secid: string, additionalParams?: Record<string, string>): Promise<TrendsResponse> {
    // 基础URL，用于获取股票趋势数据
    const baseUrl = `https://push2his.eastmoney.com/api/qt/stock/trends2/get`;
    // 查询参数，包括股票ID和其他相关字段
    const queryParams = {
        secid, // 股票的唯一标识符
        fields1: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13,f14', // 请求的字段1
        fields2: 'f51,f53,f54,f55,f56,f57,f58', // 请求的字段2
        iscr: '0', // 是否为国际市场，0表示否
        iscca: '0', // 是否为中国大陆市场，0表示否
        ut: 'f057cbcbce2a86e2866ab8877db1d059', // 用户标识
        ndays: '1', // 请求的天数，1表示最近一天
        ...additionalParams // 其他附加参数
    };
    return request<TrendsResponse>(baseUrl, queryParams);
}

interface StockDetailsResponse {
    rc?: number;  // 响应码
    rt?: number;  // 请求时间
    svr?: number; // 服务器编号
    lt?: number;  // 本地时间
    full?: number; // 是否为完整数据
    data?: {
        total: number; // 总数
        diff: Array<{
            f2: string | number; // 当前价格
            f3: string | number; // 涨跌幅
            f9: string | number; // 市盈率
            f12: string; // 股票代码
            f14: string; // 股票名称
            [key: string]: any; // 其他可能的字段
        }>;
    }
}

// 市场类型枚举
export enum MarketType {
  A = 'A', // A股
  HK = 'HK', // 港股
  US = 'US'  // 美股
}

// 根据市场类型获取股票代码前缀
export function getMarketPrefix(marketType: MarketType, code: string): string {
  switch (marketType) {
    case MarketType.A:
      return code.startsWith('6') ? '1.' : '0.';
    case MarketType.HK:
      return '116.';
    case MarketType.US:
      return '105.';
    default:
      return '0.';
  }
}

export function getStockDetails(stockList: string[], marketType: MarketType = MarketType.A): Promise<StockDetailsResponse> {
    const baseUrl = `https://push2.eastmoney.com/api/qt/ulist.np/get`;
    const queryParams = {
        fltt: '2', // 股票列表类型，2表示股票列表
        invt: '2', // 股票列表类型，2表示股票列表
        fields: 'f2,f3,f12,f14,f9', // 请求的字段
        secids: stockList.join(',') // 股票列表，用逗号分隔
    };
    return request<StockDetailsResponse>(baseUrl, queryParams);
}

interface SearchStockResponse {
    QuotationCodeTable: {
        Data: Array<{
            Code: string;
            Name: string;
            MarketType: string;
            SecurityType: string;
        }>;
    };
}

export function searchStocks(keyword: string): Promise<SearchStockResponse> {
    const baseUrl = `https://searchapi.eastmoney.com/api/suggest/get`;
    const queryParams = {
        input: keyword,
        type: '14',
        token: 'D43BF722C8E33BDC906FB84D85E326E8',
        count: '8'
    };
    return request<SearchStockResponse>(baseUrl, queryParams);
}

interface StockDetailResponse {
    data: {
        f57: string; // 股票代码
        f58: string; // 股票名称
        f43: number; // 当前价格
        f170: number; // 涨跌幅
        f71: number; // 市盈率
        // 其他字段...
    };
}

export function getStockDetail(secid: string): Promise<StockDetailResponse> {
    const baseUrl = `https://push2.eastmoney.com/api/qt/stock/get`;
    const queryParams = {
        secid,
        ut: 'f057cbcbce2a86e2866ab8877db1d059',
        fields: 'f43,f57,f58,f169,f170,f46,f44,f51,f168,f47,f164,f163,f116,f60,f45,f52,f50,f48,f167,f117,f71,f161,f49,f530,f135,f136,f137,f138,f139,f141,f142,f144,f145,f147,f148,f140,f143,f146,f149,f55,f62,f162,f92,f173,f104,f105,f84,f85,f183,f184,f185,f186,f187,f188,f189,f190,f191,f192,f107,f111,f86,f177,f78,f110,f262,f263,f264,f267,f268,f250,f251,f252,f253,f254,f255,f256,f257,f258,f266,f269,f270,f271,f273,f274,f275,f127,f199,f128,f193,f196,f194,f195,f197,f80,f280,f281,f282,f284,f285,f286,f287,f292'
    };
    return request<StockDetailResponse>(baseUrl, queryParams);
}

// 获取不同市场的股票详情
export function searchStockByMarket(keyword: string, marketType: MarketType = MarketType.A): Promise<StockDetailResponse> {
  let prefix = '';
  
  switch (marketType) {
    case MarketType.A:
      // 先尝试上海市场，再尝试深圳市场
      return getStockDetail(`1.${keyword}`)
        .then(result => {
          if (result?.data) {
            return result;
          } else {
            // 如果上海市场没有找到，尝试深圳市场
            return getStockDetail(`0.${keyword}`);
          }
        });
    case MarketType.HK:
      prefix = '116.';
      break;
    case MarketType.US:
      prefix = '105.';
      break;
    default:
      prefix = '0.';
  }
  
  return getStockDetail(`${prefix}${keyword}`);
}

// 添加获取不同市场股票详情的函数
export async function getStockDetailsByMarket(stockList: string[], marketType: MarketType = MarketType.A): Promise<StockDetailsResponse> {
  // 确保每个股票代码都有正确的市场前缀
  const formattedStockList = stockList.map(stock => {
    // 如果已经有前缀，直接返回
    if (stock.includes('.')) {
      return stock;
    }
    // 否则，添加正确的市场前缀
    return `${getMarketPrefix(marketType, stock)}${stock}`;
  });

  return getStockDetails(formattedStockList);
}

// 获取指定市场的股票列表的默认请求参数
export function getStockMarketParams(marketType: MarketType): Record<string, string> {
  switch (marketType) {
    case MarketType.A:
      return { fs: 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23' }; // A股市场参数
    case MarketType.HK:
      return { fs: 'm:128+t:3,m:128+t:4,m:128+t:1,m:128+t:2' }; // 港股市场参数
    case MarketType.US:
      return { fs: 'm:105,m:106,m:107' }; // 美股市场参数
    default:
      return {}; // 默认为空
  }
}


interface KlineResponse {
    rc: number;
    rt: number;
    svr: number;
    lt: number;
    full: number;
    data: {
        code: string;
        market: number;
        name: string;
        decimal: number;
        dktotal: number;
        preKPrice: number;
        klines: string[]; // 每个元素格式："时间,开盘价,收盘价,最高价,最低价,成交量,成交额,振幅"
    };
}

export function getKlineData(secid: string, klt: number = 101, fqt: number = 1, additionalParams?: Record<string, string>): Promise<KlineResponse> {
    const baseUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get`;
    const queryParams = {
        secid,
        fields1: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13',
        fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
        klt: klt.toString(), // K线间距: 101=日线, 102=周线, 103=月线, 104=季线, 105=年线
        fqt: fqt.toString(), // 复权类型：0=不复权, 1=前复权, 2=后复权
        end: '20500101',
        lmt: '1000', // 最大返回条数
        ...additionalParams
    };
    return request<KlineResponse>(baseUrl, queryParams);
}
