/**
 * Business analytics utilities for Hisab.
 * Revenue calculations, grouping, trends, and customer insights.
 */

import type { OBTransaction } from './api';

// -- Formatting --

export function formatOMR(amount: number, currency: string = 'OMR'): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${currency}`;
}

// -- Date Helpers --

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

// -- Transaction Filters --

export function getTransactionsInRange(
  transactions: OBTransaction[],
  start: Date,
  end: Date,
): OBTransaction[] {
  return transactions.filter((t) => {
    const d = new Date(t.BookingDateTime);
    return d >= start && d <= end;
  });
}

export function getThisMonthTransactions(transactions: OBTransaction[]): OBTransaction[] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return getTransactionsInRange(transactions, start, end);
}

export function getLastMonthTransactions(transactions: OBTransaction[]): OBTransaction[] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  return getTransactionsInRange(transactions, start, end);
}

export function getTodayTransactions(transactions: OBTransaction[]): OBTransaction[] {
  const today = new Date();
  return transactions.filter((t) => isSameDay(new Date(t.BookingDateTime), today));
}

// -- Revenue Calculations --

export function sumCredits(transactions: OBTransaction[]): number {
  return transactions
    .filter((t) => t.CreditDebitIndicator === 'Credit')
    .reduce((s, t) => s + parseFloat(t.Amount.Amount), 0);
}

export function sumDebits(transactions: OBTransaction[]): number {
  return transactions
    .filter((t) => t.CreditDebitIndicator === 'Debit')
    .reduce((s, t) => s + parseFloat(t.Amount.Amount), 0);
}

export function countTransactions(transactions: OBTransaction[]): number {
  return transactions.length;
}

export function averageTransactionValue(transactions: OBTransaction[]): number {
  if (transactions.length === 0) return 0;
  const total = transactions.reduce((s, t) => s + parseFloat(t.Amount.Amount), 0);
  return total / transactions.length;
}

// -- Daily Revenue (last 7 days) --

export interface DailyRevenue {
  date: string;       // "Mon", "Tue", etc.
  fullDate: string;   // "2026-04-12"
  revenue: number;
  count: number;
}

export function getDailyRevenue(transactions: OBTransaction[], days: number = 7): DailyRevenue[] {
  const result: DailyRevenue[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    const dayTx = getTransactionsInRange(transactions, d, dayEnd)
      .filter((t) => t.CreditDebitIndicator === 'Credit');

    const revenue = dayTx.reduce((s, t) => s + parseFloat(t.Amount.Amount), 0);
    result.push({
      date: dayNames[d.getDay()],
      fullDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      revenue,
      count: dayTx.length,
    });
  }

  return result;
}

// -- Monthly Revenue (last 6 months) --

export interface MonthlyRevenue {
  month: string;      // "Jan", "Feb", etc.
  year: number;
  revenue: number;
  expenses: number;
  count: number;
}

export function getMonthlyRevenue(transactions: OBTransaction[], months: number = 6): MonthlyRevenue[] {
  const result: MonthlyRevenue[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthTx = getTransactionsInRange(transactions, start, end);

    result.push({
      month: monthNames[start.getMonth()],
      year: start.getFullYear(),
      revenue: sumCredits(monthTx),
      expenses: sumDebits(monthTx),
      count: monthTx.length,
    });
  }

  return result;
}

// -- Top Customers --

export interface TopCustomer {
  name: string;
  totalAmount: number;
  transactionCount: number;
  lastTransaction: string;
}

export function getTopCustomers(transactions: OBTransaction[], limit: number = 5): TopCustomer[] {
  const customerMap = new Map<string, TopCustomer>();

  const creditTx = transactions.filter((t) => t.CreditDebitIndicator === 'Credit');

  for (const tx of creditTx) {
    // Use transaction information as customer name proxy
    const name = tx.TransactionInformation || 'Unknown Customer';

    if (!customerMap.has(name)) {
      customerMap.set(name, {
        name,
        totalAmount: 0,
        transactionCount: 0,
        lastTransaction: tx.BookingDateTime,
      });
    }

    const customer = customerMap.get(name)!;
    customer.totalAmount += parseFloat(tx.Amount.Amount);
    customer.transactionCount++;
    if (tx.BookingDateTime > customer.lastTransaction) {
      customer.lastTransaction = tx.BookingDateTime;
    }
  }

  return Array.from(customerMap.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);
}

// -- Peak Hours --

export interface HourlyVolume {
  hour: number;       // 0-23
  label: string;      // "9 AM", "2 PM", etc.
  count: number;
  amount: number;
}

export function getHourlyVolume(transactions: OBTransaction[]): HourlyVolume[] {
  const hours: HourlyVolume[] = [];
  for (let h = 0; h < 24; h++) {
    const ampm = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
    hours.push({ hour: h, label: ampm, count: 0, amount: 0 });
  }

  for (const tx of transactions) {
    const d = new Date(tx.BookingDateTime);
    const h = d.getHours();
    hours[h].count++;
    hours[h].amount += parseFloat(tx.Amount.Amount);
  }

  return hours;
}

// -- Revenue by Day of Week --

export interface DayOfWeekRevenue {
  day: string;
  dayIndex: number;
  revenue: number;
  count: number;
}

export function getRevenueByDayOfWeek(transactions: OBTransaction[]): DayOfWeekRevenue[] {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const days: DayOfWeekRevenue[] = dayNames.map((name, i) => ({
    day: name,
    dayIndex: i,
    revenue: 0,
    count: 0,
  }));

  const creditTx = transactions.filter((t) => t.CreditDebitIndicator === 'Credit');
  for (const tx of creditTx) {
    const d = new Date(tx.BookingDateTime);
    const dayIdx = d.getDay();
    days[dayIdx].revenue += parseFloat(tx.Amount.Amount);
    days[dayIdx].count++;
  }

  return days;
}

// -- Daily Transaction Volume (last 30 days) --

export interface DailyVolume {
  date: string;
  count: number;
  amount: number;
}

export function getDailyVolume(transactions: OBTransaction[], days: number = 30): DailyVolume[] {
  const result: DailyVolume[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    const dayTx = getTransactionsInRange(transactions, d, dayEnd);

    result.push({
      date: `${d.getDate()}/${d.getMonth() + 1}`,
      count: dayTx.length,
      amount: dayTx.reduce((s, t) => s + parseFloat(t.Amount.Amount), 0),
    });
  }

  return result;
}

// -- Percentage Change --

export function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
