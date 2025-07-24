import type { PerpetualPosition, Order, AdvancedSettings } from "~/lib/types";
import { DEFAULT_ADVANCED_SETTINGS } from "~/lib/constants";

export interface PositionAnalysis {
  coin: string;
  isLong: boolean;
  entryPrice: number;
  positionSize: number;
  positionValue: number;
  entryFee: number;
  expectedProfit: number;
  expectedLoss: number;
  tpOrders: {
    price: number;
    size: number;
    profit: number;
    exitFee: number;
    netProfit: number;
    priceMove: number;
    percentMove: number;
    pnlPercent: number;
  }[];
  slOrder?: {
    price: number;
    size: number;
    loss: number;
    exitFee: number;
    totalLoss: number;
    isInProfit: boolean;
    priceMove: number;
    percentMove: number;
    pnlPercent: number;
  };
  visualization: {
    minPrice: number;
    maxPrice: number;
    priceRange: number;
    entryPosition: number;
    currentPosition?: number;
    tpPositions: number[];
    slPosition?: number;
  };
  summary: {
    totalTpSize: number;
    totalTpProfit: number;
    totalTpExitFees: number;
    avgTpPrice: number;
    avgTpPriceMove: number;
    avgTpPercentMove: number;
    maxFees: number;
    breakevenPercent: number;
    rrRatio: number;
  };
}

export interface PositionAnalysisResult {
  totalExpectedProfit: number;
  totalExpectedLoss: number;
  positionAnalysis: PositionAnalysis[];
}

export function calculatePositionAnalysis(
  positions: PerpetualPosition[],
  orders: Order[] | undefined,
  settings: AdvancedSettings = DEFAULT_ADVANCED_SETTINGS
): PositionAnalysisResult {
  let totalExpectedProfit = 0;
  let totalExpectedLoss = 0;
  const positionAnalysis: PositionAnalysis[] = [];

  positions.forEach((position) => {
    const isLong = parseFloat(position.szi) > 0;
    const entryPrice = parseFloat(position.entryPx);
    const positionSize = Math.abs(parseFloat(position.szi));
    const positionValue = entryPrice * positionSize;
    
    // Entry fees (taker fee for market entry)
    const entryFee = positionValue * (settings.takerFee / 100);
    
    let positionExpectedProfit = 0;
    let positionExpectedLoss = 0;
    const tpOrderDetails: PositionAnalysis['tpOrders'] = [];
    let slOrderDetail: PositionAnalysis['slOrder'] | undefined;
    
    let totalTpSize = 0;
    let totalTpProfit = 0;
    let totalTpExitFees = 0;
    let avgTpPrice = 0;

    if (orders) {
      const positionOrders = orders.filter(order => order.coin === position.coin);
      
      // Calculate TP profit
      const tpOrders = positionOrders.filter(order => 
        order.orderType === "Limit" && order.reduceOnly === true
      );
      
      tpOrders.forEach((tpOrder) => {
        const tpPrice = parseFloat(tpOrder.limitPx);
        const tpSize = parseFloat(tpOrder.sz);
        
        // Calculate profit/loss per coin
        const tpProfitPerCoin = isLong ? (tpPrice - entryPrice) : (entryPrice - tpPrice);
        const tpProfit = tpProfitPerCoin * tpSize;
        
        // Calculate exit fee for this TP order
        const exitFee = tpSize * tpPrice * (settings.makerFee / 100);
        
        // Proportional entry fee for this TP order
        const proportionalEntryFee = entryFee * (tpSize / positionSize);
        
        const netProfit = tpProfit - proportionalEntryFee - exitFee;
        
        const priceMove = Math.abs(tpPrice - entryPrice);
        const percentMove = (priceMove / entryPrice) * 100;
        const pnlPercent = (tpProfitPerCoin / entryPrice) * 100;
        
        tpOrderDetails.push({
          price: tpPrice,
          size: tpSize,
          profit: tpProfit,
          exitFee: exitFee,
          netProfit: netProfit,
          priceMove: priceMove,
          percentMove: percentMove,
          pnlPercent: pnlPercent
        });
        
        positionExpectedProfit += netProfit;
        totalTpSize += tpSize;
        totalTpProfit += tpProfit;
        totalTpExitFees += exitFee;
        avgTpPrice += tpPrice * tpSize; // Weighted sum
      });
      
      // Calculate average TP price
      if (totalTpSize > 0) {
        avgTpPrice = avgTpPrice / totalTpSize;
      }
      
      // Calculate SL loss
      const slOrders = positionOrders.filter(order => 
        order.orderType === "Stop Market"
      );
      
      if (slOrders.length > 0) {
        // Use first SL order
        const firstSL = slOrders[0];
        const slPrice = firstSL.triggerPx ? parseFloat(firstSL.triggerPx) : parseFloat(firstSL.limitPx);
        
        // Calculate loss per coin
        const slLossPerCoin = isLong ? (entryPrice - slPrice) : (slPrice - entryPrice);
        const slLossBeforeFees = slLossPerCoin * positionSize;
        
        // Exit fee for SL (taker fee for stop market)
        const slExitFee = positionSize * slPrice * (settings.takerFee / 100);
        
        // Total SL impact
        const totalSlLoss = slLossBeforeFees < 0 
          ? slLossBeforeFees - entryFee - slExitFee  // Profit scenario
          : slLossBeforeFees + entryFee + slExitFee; // Loss scenario
        
        const isInProfit = slLossBeforeFees < 0;
        
        const slPriceMove = Math.abs(slPrice - entryPrice);
        const slPercentMove = (slPriceMove / entryPrice) * 100;
        const slPnlPercent = (slLossPerCoin / entryPrice) * 100;
        
        slOrderDetail = {
          price: slPrice,
          size: positionSize,
          loss: slLossBeforeFees,
          exitFee: slExitFee,
          totalLoss: totalSlLoss,
          isInProfit: isInProfit,
          priceMove: slPriceMove,
          percentMove: slPercentMove,
          pnlPercent: slPnlPercent
        };
        
        if (totalSlLoss > 0) {
          positionExpectedLoss += totalSlLoss;
        }
      }
    }
    
    // Calculate visualization data
    const allPrices = [entryPrice];
    tpOrderDetails.forEach(tp => allPrices.push(tp.price));
    if (slOrderDetail) allPrices.push(slOrderDetail.price);
    
    const minPrice = Math.min(...allPrices) * 0.995; // Add 0.5% padding
    const maxPrice = Math.max(...allPrices) * 1.005; // Add 0.5% padding
    const priceRange = maxPrice - minPrice;
    
    // Helper to convert price to percentage position
    const priceToPercent = (price: number) => ((price - minPrice) / priceRange) * 100;
    
    const visualization = {
      minPrice,
      maxPrice,
      priceRange,
      entryPosition: priceToPercent(entryPrice),
      tpPositions: tpOrderDetails.map(tp => priceToPercent(tp.price)),
      slPosition: slOrderDetail ? priceToPercent(slOrderDetail.price) : undefined
    };
    
    // Calculate average TP price move and percent
    const avgTpPriceMove = avgTpPrice > 0 ? Math.abs(avgTpPrice - entryPrice) : 0;
    const avgTpPercentMove = avgTpPrice > 0 ? (avgTpPriceMove / entryPrice) * 100 : 0;
    
    // Calculate max fees (entry + either all TP exits or SL exit)
    const maxFees = entryFee + (slOrderDetail ? slOrderDetail.exitFee : totalTpExitFees);
    
    // Calculate breakeven percentage
    const breakevenPercent = (entryFee / positionValue) * 100;
    
    // Calculate R:R ratio
    const rrRatio = positionExpectedLoss > 0 ? positionExpectedProfit / positionExpectedLoss : 0;
    
    totalExpectedProfit += positionExpectedProfit;
    totalExpectedLoss += positionExpectedLoss;
    
    positionAnalysis.push({
      coin: position.coin,
      isLong,
      entryPrice,
      positionSize,
      positionValue,
      entryFee,
      expectedProfit: positionExpectedProfit,
      expectedLoss: positionExpectedLoss,
      tpOrders: tpOrderDetails,
      slOrder: slOrderDetail,
      visualization,
      summary: {
        totalTpSize,
        totalTpProfit,
        totalTpExitFees,
        avgTpPrice,
        avgTpPriceMove,
        avgTpPercentMove,
        maxFees,
        breakevenPercent,
        rrRatio
      }
    });
  });

  return {
    totalExpectedProfit,
    totalExpectedLoss,
    positionAnalysis
  };
}