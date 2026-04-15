"""Compute monthly income and existing-debt obligations from real account data.

Income = avg of the last 3 months of credit transactions tagged as 'Salary'
         (or, if none tagged, the largest recurring monthly credit cluster).

Existing debt = sum of:
  - active loan_standing_orders monthly amount for the customer
  - rough estimate from `transactions` table for repeat outgoing transfers
    (BD's existing transfer pattern is "Standing Order" or recurring debits).
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from app.core.database import acquire


@dataclass(frozen=True)
class Affordability:
    monthly_income_omr: Decimal
    monthly_existing_debt_omr: Decimal


async def compute(customer_id: str) -> Affordability:
    income = await _estimate_income(customer_id)
    debt = await _estimate_debt(customer_id)
    return Affordability(monthly_income_omr=income, monthly_existing_debt_omr=debt)


async def _estimate_income(customer_id: str) -> Decimal:
    """Average the last 3 months of credit transactions matching common
    salary patterns (description LIKE '%salary%' or transaction_type='Salary').

    Falls back to the average of the top-3 monthly credit totals if no
    salary-tagged transactions are found.
    """
    async with acquire() as conn:
        # First try to find tagged salary credits in the last 3 months.
        row = await conn.fetchrow(
            """
            WITH cust_accts AS (
                SELECT account_id FROM accounts WHERE customer_id = $1
            ),
            tagged AS (
                SELECT date_trunc('month', created_at) AS month, SUM(amount) AS total
                  FROM transactions
                 WHERE account_id IN (SELECT account_id FROM cust_accts)
                   AND direction = 'Credit'
                   AND created_at > NOW() - INTERVAL '4 months'
                   AND (transaction_type = 'Salary' OR description ILIKE '%salary%' OR description ILIKE '%payroll%')
                 GROUP BY 1
            )
            SELECT COALESCE(AVG(total), 0)::numeric(18,3) AS avg_income FROM tagged
            """,
            customer_id,
        )
        avg_income = Decimal(str(row["avg_income"]))
        if avg_income > 0:
            return avg_income

        # Fallback: average of top-3 monthly credit aggregates (last 6 months).
        row = await conn.fetchrow(
            """
            WITH cust_accts AS (
                SELECT account_id FROM accounts WHERE customer_id = $1
            ),
            monthly AS (
                SELECT date_trunc('month', created_at) AS month, SUM(amount) AS total
                  FROM transactions
                 WHERE account_id IN (SELECT account_id FROM cust_accts)
                   AND direction = 'Credit'
                   AND created_at > NOW() - INTERVAL '6 months'
                 GROUP BY 1
                 ORDER BY total DESC
                 LIMIT 3
            )
            SELECT COALESCE(AVG(total), 0)::numeric(18,3) AS avg_top FROM monthly
            """,
            customer_id,
        )
        return Decimal(str(row["avg_top"]))


async def _estimate_debt(customer_id: str) -> Decimal:
    """Sum monthly debt obligations from active auto loans + repeating debits.

    For MVP we compute:
      - sum of monthly_installment from active auto_loans (this customer)
      - + sum of active loan_standing_orders amount (just in case)
    """
    async with acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT
              COALESCE(
                (SELECT SUM(monthly_installment) FROM auto_loans
                  WHERE customer_id = $1 AND status = 'active'), 0
              )::numeric(18,3) AS auto_loans,
              COALESCE(
                (SELECT SUM(amount) FROM loan_standing_orders so
                  JOIN auto_loans al ON al.standing_order_id = so.standing_order_id
                  WHERE al.customer_id = $1 AND so.status = 'active'), 0
              )::numeric(18,3) AS standing
            """,
            customer_id,
        )
    auto_loans = Decimal(str(row["auto_loans"]))
    standing = Decimal(str(row["standing"]))
    # Avoid double-counting if standing-order is the same as auto-loan installment.
    return max(auto_loans, standing)
