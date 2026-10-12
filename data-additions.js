// 經交叉確認的員山景點增補；先載入 data.js，再載入本檔。
const additions = [
  {id:'dahu-scenic',name:'大湖風景特定區（水印大湖）',cat:'自然',emoji:'🌊',address:'宜蘭縣員山鄉湖北村湖前路185號',desc:'2026/09/26 重新開園的湖岸景點；水上體驗依官方公告。',hours:'開放資訊依官方公告',tags:['湖泊','景點'],sourceUrl:'https://travel.yilan.gov.tw/zh-tw/event/344/'},
  {id:'barn-stay',name:'Barn Stay cafe',cat:'咖啡',emoji:'☕',address:'宜蘭縣員山鄉惠民路429號',desc:'穀倉改建的森林系咖啡與選物空間。',hours:'約 12:00–18:00；週四常休，依店家公告',tags:['咖啡','庭園'],sourceUrl:'https://ha-blog.tw/54-246412-20250506/'},
  {id:'sunlake-cafe',name:'太陽埤湖畔咖啡館',cat:'咖啡',emoji:'☕',address:'宜蘭縣員山鄉內城路662號',desc:'太陽埤旁湖景咖啡館，供應簡餐與飲品。',hours:'約 10:00–17:00；週二三常休，依店家公告',tags:['湖景','親子'],sourceUrl:'https://ezgo.ardswc.gov.tw/zh-tw/spot/1745/'},
  {id:'sunnyway',name:'酢老爺蜜釀工坊',cat:'農場',emoji:'🍯',address:'宜蘭縣員山鄉湖東村茄苳路3號',desc:'蜂蜜釀醋、在地農產加工與手作醋體驗，建議先預約。',hours:'參訪與 DIY 請先洽詢預約',tags:['蜜釀醋','DIY'],sourceUrl:'https://www.dahudi.org/service/%E9%85%A2%E8%80%81%E7%88%BA%E8%9C%9C%E9%87%80%E5%B7%A5%E5%9D%8A'}
];
for (const place of additions) {
  if (!window.YUANSHAN_PLACES.some(p => p.id === place.id)) window.YUANSHAN_PLACES.push(place);
}
