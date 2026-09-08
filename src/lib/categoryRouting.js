const routingRules = [
  ["BuyCrypto", ["buy", "fiat", "card", "payment", "deposit", "onramp"]],
  ["Spot", ["spot", "trade", "market", "chart", "pair", "exchange"]],
  ["Futures", ["future", "perpetual", "leverage", "long", "short"]],
  ["Earn", ["earn", "staking", "savings", "yield", "vault", "reward"]],
  ["CopyTrading", ["copy", "trader", "signal", "strategy", "follow"]],
  ["Security", ["security", "shield", "safe", "lock", "key", "verify", "auth"]],
];

export function suggestUploadCategory(name) {
  const normalized = name.toLowerCase();
  return routingRules.find(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))?.[0] ?? "Campaigns";
}

export function resolveInitialUploadCategory(openCategory, name) {
  return openCategory === "All" ? suggestUploadCategory(name) : openCategory;
}
