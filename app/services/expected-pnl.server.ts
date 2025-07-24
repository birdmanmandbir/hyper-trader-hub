import type { PerpetualPosition, Order, AdvancedSettings } from "~/lib/types";
import { DEFAULT_ADVANCED_SETTINGS } from "~/lib/constants";

export interface ExpectedPnLResult {
  totalExpectedProfit: number;
  totalExpectedLoss: number;
  positionDetails: {
    coin: string;
    expectedProfit: number;
    expectedLoss: number;
    tpOrders: number;
    slOrders: number;
  }[];
}

export function calculateExpectedPnL(
  positions: PerpetualPosition[],
  orders: Order[] | undefined,
  settings: AdvancedSettings = DEFAULT_ADVANCED_SETTINGS
): ExpectedPnLResult {
  let totalExpectedProfit = 0;
  let totalExpectedLoss = 0;
  const positionDetails: ExpectedPnLResult['positionDetails'] = [];

  positions.forEach((position) => {
    const isLong = parseFloat(position.szi) > 0;
    const entry = parseFloat(position.entryPx);
    const sizeNum = Math.abs(parseFloat(position.szi));
    
    let positionExpectedProfit = 0;
    let positionExpectedLoss = 0;
    let tpOrderCount = 0;
    let slOrderCount = 0;

    if (orders) {
      const positionOrders = orders.filter(order => order.coin === position.coin);
      
      // Calculate TP profit
      const tpOrders = positionOrders.filter(order => 
        order.orderType === "Limit" && order.reduceOnly === true
      );
      
      tpOrderCount = tpOrders.length;
      
      tpOrders.forEach((tpOrder) => {
        const tpPrice = parseFloat(tpOrder.limitPx);
        const tpSize = parseFloat(tpOrder.sz);
        
        // Calculate profit/loss per coin
        const tpProfitPerCoin = isLong ? (tpPrice - entry) : (entry - tpPrice);
        const tpProfit = tpProfitPerCoin * tpSize;
        
        // Calculate fees: size * price * fee (fee is already in decimal form)
        const entryFee = tpSize * entry * (settings.takerFee / 10000);
        const exitFee = tpSize * tpPrice * (settings.makerFee / 10000);
        
        const netProfit = tpProfit - entryFee - exitFee;
        positionExpectedProfit += netProfit;
      });
      
      // Calculate SL loss
      const slOrders = positionOrders.filter(order => 
        order.orderType === "Stop Market"
      );
      
      slOrderCount = slOrders.length;
      
      if (slOrders.length > 0) {
        // Use first SL order
        const firstSL = slOrders[0];
        const slPrice = firstSL.triggerPx ? parseFloat(firstSL.triggerPx) : parseFloat(firstSL.limitPx);
        
        // Calculate loss per coin
        const slLossPerCoin = isLong ? (entry - slPrice) : (slPrice - entry);
        const slLossBeforeFees = slLossPerCoin * sizeNum;
        
        // Calculate fees: size * price * fee (fee is already in decimal form)
        const entryFee = sizeNum * entry * (settings.takerFee / 10000);
        const exitFee = sizeNum * slPrice * (settings.takerFee / 10000);
        
        // Total SL impact
        const totalSlLoss = slLossBeforeFees < 0 
          ? slLossBeforeFees - entryFee - exitFee  // Profit scenario
          : slLossBeforeFees + entryFee + exitFee; // Loss scenario
        
        if (totalSlLoss > 0) {
          positionExpectedLoss += totalSlLoss;
        }
        // Note: We don't add SL profit to expected profit since SL is for risk management
      }
    }
    
    totalExpectedProfit += positionExpectedProfit;
    totalExpectedLoss += positionExpectedLoss;
    
    positionDetails.push({
      coin: position.coin,
      expectedProfit: positionExpectedProfit,
      expectedLoss: positionExpectedLoss,
      tpOrders: tpOrderCount,
      slOrders: slOrderCount
    });
  });

  return {
    totalExpectedProfit,
    totalExpectedLoss,
    positionDetails
  };
}