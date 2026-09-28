import { useState, useEffect, useCallback } from "react";
import { formatLocalDate } from "@/lib/localDate";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";

const POPULAR_CURRENCIES: string[] = [...SUPPORTED_CURRENCIES];

interface ExchangeRates {
  [currency: string]: number;
}

let cachedRates: ExchangeRates | null = null;
let cacheDate: string | null = null;

async function fetchRates(): Promise<ExchangeRates> {
  // Local, not UTC: a UTC key rolls the cache over at 08:00 in +08:00 rather than at
  // local midnight, serving yesterday's rates through the early morning.
  const today = formatLocalDate();
  if (cachedRates && cacheDate === today) return cachedRates;

  const res = await fetch("https://api.frankfurter.dev/v1/latest?base=SGD");
  if (!res.ok) throw new Error("Failed to fetch exchange rates");
  const data = await res.json();
  // data.rates is { USD: 0.74, EUR: 0.68, ... } relative to SGD
  // We need: how many SGD per 1 unit of foreign currency = 1 / rate
  const rates: ExchangeRates = { SGD: 1 };
  for (const [cur, rate] of Object.entries(data.rates)) {
    rates[cur] = 1 / (rate as number);
  }
  cachedRates = rates;
  cacheDate = today;
  return rates;
}

export function useCurrencyConversion() {
  const [rates, setRates] = useState<ExchangeRates | null>(cachedRates);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchRates()
      .then(setRates)
      .catch(() => setRates({ SGD: 1 }))
      .finally(() => setLoading(false));
  }, []);

  const convertToSGD = useCallback(
    (amount: number, fromCurrency: string): number => {
      if (!rates || fromCurrency === "SGD") return amount;
      const rate = rates[fromCurrency];
      if (!rate) return amount;
      return Math.round(amount * rate * 100) / 100;
    },
    [rates],
  );

  return { rates, loading, convertToSGD, currencies: POPULAR_CURRENCIES };
}
