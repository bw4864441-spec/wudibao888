export function assetPath(basePath, folder, file, extension) {
  const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return `${normalizedBase}assets/${folder}/${file}.${extension}`;
}

const asset = (file) => assetPath(import.meta.env.BASE_URL, "icons", file, "webp");
const customAsset = (file) => assetPath(import.meta.env.BASE_URL, "custom-icons", file, "png");
const kingkongAsset = (file) => assetPath(import.meta.env.BASE_URL, "kingkong-icons", file, "png");
const businessAsset = (file) => assetPath(import.meta.env.BASE_URL, "business-icons", file, "png");

export const categories = ["All", "BuyCrypto", "Spot", "Futures", "Earn", "CopyTrading", "Campaigns", "Security"];

const rawIcons = [
  { id: "liquidity-blocks", name: "Liquidity blocks", nameZh: "流动性模块", category: "Earn", src: businessAsset("liquidity-blocks") },
  { id: "happy-token", name: "Happy token", nameZh: "快乐代币", category: "Campaigns", src: businessAsset("happy-token") },
  { id: "eth-deposit", name: "ETH deposit", nameZh: "ETH 充值", category: "BuyCrypto", src: businessAsset("eth-deposit") },
  { id: "bonus-gift", name: "Bonus gift", nameZh: "奖励礼盒", category: "Campaigns", src: businessAsset("bonus-gift") },
  { id: "market-growth", name: "Market growth", nameZh: "行情增长", category: "Futures", src: businessAsset("market-growth") },
  { id: "token-send", name: "Token send", nameZh: "代币转出", category: "BuyCrypto", src: businessAsset("token-send") },
  { id: "liquidity-wallet", name: "Liquidity wallet", nameZh: "流动性钱包", category: "BuyCrypto", src: businessAsset("liquidity-wallet") },
  { id: "rewards-box", name: "Rewards box", nameZh: "权益礼包", category: "Campaigns", src: businessAsset("rewards-box") },
  { id: "fiat-exchange", name: "Fiat exchange", nameZh: "法币兑换", category: "BuyCrypto", src: businessAsset("fiat-exchange") },
  { id: "yield-ring", name: "Yield ring", nameZh: "收益环", category: "Earn", src: businessAsset("yield-ring") },
  { id: "growth-arrow", name: "Growth arrow", nameZh: "增长箭头", category: "Earn", src: businessAsset("growth-arrow") },
  { id: "business-wallet", name: "Asset wallet", nameZh: "资产钱包", category: "BuyCrypto", src: businessAsset("business-wallet") },
  { id: "secure-vault", name: "Secure vault", nameZh: "安全金库", category: "Security", src: businessAsset("secure-vault") },
  { id: "kingkong-rocket", name: "Power rocket", nameZh: "能量火箭", category: "Kingkong", src: kingkongAsset("rocket") },
  { id: "kingkong-smiley", name: "Happy service", nameZh: "快乐服务", category: "Kingkong", src: kingkongAsset("smiley") },
  { id: "kingkong-analytics", name: "Growth analytics", nameZh: "增长数据", category: "Kingkong", src: kingkongAsset("analytics") },
  { id: "kingkong-gift", name: "Rewards gift", nameZh: "权益礼包", category: "Kingkong", src: kingkongAsset("gift") },
  { id: "kingkong-balloon", name: "Discovery balloon", nameZh: "探索热气球", category: "Kingkong", src: kingkongAsset("hot-air-balloon") },
  { id: "kingkong-wallet", name: "Digital wallet", nameZh: "数字钱包", category: "Kingkong", src: kingkongAsset("wallet") },
  { id: "kingkong-app-grid", name: "App services", nameZh: "应用服务", category: "Kingkong", src: kingkongAsset("app-grid") },
  { id: "kingkong-download", name: "Download token", nameZh: "下载代币", category: "Kingkong", src: kingkongAsset("download-token") },
  { id: "ai-revenue-wallet", name: "AI revenue wallet", nameZh: "AI 收益钱包", category: "Tech", src: customAsset("ai-revenue-wallet") },
  { id: "token-savings-jar", name: "Token savings jar", nameZh: "代币储蓄罐", category: "Tech", src: customAsset("token-savings-jar") },
  { id: "liquid-football", name: "Liquid football", nameZh: "流动足球", category: "Objects", src: customAsset("liquid-football") },
  { id: "growth-rate", name: "Growth rate", nameZh: "增长利率", category: "Tech", src: customAsset("growth-rate") },
  { id: "medical-coverage", name: "Medical coverage", nameZh: "医疗保障", category: "Objects", src: customAsset("medical-coverage") },
  { id: "apple", name: "Red apple", nameZh: "红苹果", category: "Food", src: asset("1f34e") },
  { id: "banana", name: "Banana", nameZh: "香蕉", category: "Food", src: asset("1f34c") },
  { id: "strawberry", name: "Strawberry", nameZh: "草莓", category: "Food", src: asset("1f353") },
  { id: "pizza", name: "Pizza", nameZh: "披萨", category: "Food", src: asset("1f355") },
  { id: "hot-dog", name: "Hot dog", nameZh: "热狗", category: "Food", src: asset("1f32d") },
  { id: "croissant", name: "Croissant", nameZh: "牛角包", category: "Food", src: asset("1f950") },
  { id: "cookie", name: "Cookie", nameZh: "曲奇", category: "Food", src: asset("1f36a") },
  { id: "donut", name: "Donut", nameZh: "甜甜圈", category: "Food", src: asset("1f369") },
  { id: "cat", name: "Cat", nameZh: "猫", category: "Animals", src: asset("1f408") },
  { id: "dog", name: "Dog", nameZh: "狗", category: "Animals", src: asset("1f415") },
  { id: "fish", name: "Fish", nameZh: "鱼", category: "Animals", src: asset("1f41f") },
  { id: "butterfly", name: "Butterfly", nameZh: "蝴蝶", category: "Animals", src: asset("1f98b") },
  { id: "snail", name: "Snail", nameZh: "蜗牛", category: "Animals", src: asset("1f40c") },
  { id: "robot", name: "Robot", nameZh: "机器人", category: "Tech", src: asset("1f916") },
  { id: "laptop", name: "Laptop", nameZh: "笔记本电脑", category: "Tech", src: asset("1f4bb") },
  { id: "headphones", name: "Headphones", nameZh: "耳机", category: "Tech", src: asset("1f3a7") },
  { id: "camera", name: "Camera", nameZh: "相机", category: "Tech", src: asset("1f4f7") },
  { id: "rocket", name: "Rocket", nameZh: "火箭", category: "Tech", src: asset("1f680") },
  { id: "antenna", name: "Satellite antenna", nameZh: "卫星天线", category: "Tech", src: asset("1f4e1") },
  { id: "light-bulb", name: "Light bulb", nameZh: "灯泡", category: "Objects", src: asset("1f4a1") },
  { id: "pencil", name: "Pencil", nameZh: "铅笔", category: "Objects", src: asset("270f-fe0f") },
  { id: "coffee", name: "Coffee", nameZh: "咖啡", category: "Objects", src: asset("2615") },
  { id: "key", name: "Key", nameZh: "钥匙", category: "Objects", src: asset("1f511") },
  { id: "alarm", name: "Alarm clock", nameZh: "闹钟", category: "Objects", src: asset("23f0") },
  { id: "ferry", name: "Ferry", nameZh: "渡轮", category: "Travel", src: asset("1f6f3-fe0f") },
  { id: "airplane", name: "Airplane", nameZh: "飞机", category: "Travel", src: asset("2708-fe0f") },
  { id: "mountain", name: "Mountain", nameZh: "山峰", category: "Travel", src: asset("1f3d4-fe0f") },
  { id: "compass", name: "Compass", nameZh: "指南针", category: "Travel", src: asset("1f9ed") },
  { id: "boat", name: "Sailboat", nameZh: "帆船", category: "Travel", src: asset("1f3ae") },
  { id: "seat", name: "Seat", nameZh: "座椅", category: "Travel", src: asset("1f6a2") },
];

const businessCategories = {
  BuyCrypto: new Set(["eth-deposit", "token-send", "liquidity-wallet", "fiat-exchange", "business-wallet", "kingkong-wallet", "kingkong-download", "ai-revenue-wallet", "token-savings-jar", "key"]),
  Spot: new Set(["liquid-football", "apple", "banana", "strawberry", "pizza", "hot-dog", "croissant", "cookie", "donut", "fish"]),
  Futures: new Set(["market-growth", "kingkong-rocket", "kingkong-analytics", "growth-rate", "rocket", "antenna", "airplane", "mountain"]),
  Earn: new Set(["liquidity-blocks", "yield-ring", "growth-arrow", "kingkong-balloon", "light-bulb", "coffee", "alarm", "compass"]),
  CopyTrading: new Set(["kingkong-smiley", "robot", "laptop", "headphones", "camera", "cat", "dog"]),
  Campaigns: new Set(["happy-token", "bonus-gift", "rewards-box", "kingkong-gift", "kingkong-app-grid", "butterfly", "snail", "ferry", "sailboat", "seat"]),
  Security: new Set(["secure-vault", "medical-coverage", "pencil"]),
};

function businessCategoryFor(iconId) {
  return Object.entries(businessCategories).find(([, ids]) => ids.has(iconId))?.[0] ?? "Security";
}

export const icons = rawIcons.map((icon) => ({ ...icon, category: businessCategoryFor(icon.id) }));
