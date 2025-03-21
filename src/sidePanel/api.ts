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

async function request(url: string, queryParams?: Record<string, string>): Promise<TrendsResponse> {
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
    return request(baseUrl, queryParams);
}

interface StockDetailsResponse {
    total: number; // 总数
    diff: Array<{
        f2: string | number; // 当前价格
        f3: string | number; // 涨跌幅
        f9: string | number; // 市盈率
        f12: string; // 股票代码
        f14: string; // 股票名称
    }>;
}

export function getStockDetails(stockList: string[]): Promise<StockDetailsResponse> {
    const baseUrl = `https://push2.eastmoney.com/api/qt/ulist.np/get`;
    const queryParams = {
        fltt: '2', // 股票列表类型，2表示股票列表
        invt: '2', // 股票列表类型，2表示股票列表
        fields: 'f2,f3,f12,f14,f9', // 请求的字段
        secids: stockList.join(',') // 股票列表，用逗号分隔
    };
    return request(baseUrl, queryParams);
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
    return request(baseUrl, queryParams);
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
    return request(baseUrl, queryParams);
}
