import { pool } from '../../db/pool';
import type { CreateLoanRecord, Loan, LoanRepository, LoanStatus, LoanSummary } from './loan.types';

type LoanRow = {
  id: string; user_id: string; friend_name: string; amount: number | string; due_date: string;
  status: LoanStatus; receipt_path: string | null; created_at: Date | string; repaid_at: Date | string | null;
};

function toIsoTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapLoan(row: LoanRow): Loan {
  return {
    id: row.id,
    userId: row.user_id,
    friendName: row.friend_name,
    amount: Number(row.amount),
    dueDate: String(row.due_date).slice(0, 10),
    status: row.status,
    receiptPath: row.receipt_path,
    createdAt: toIsoTimestamp(row.created_at),
    repaidAt: row.repaid_at ? toIsoTimestamp(row.repaid_at) : null
  };
}

const columns = `id, user_id, friend_name, amount::float8 AS amount,
  to_char(due_date, 'YYYY-MM-DD') AS due_date, status, receipt_path, created_at, repaid_at`;

export class PgLoanRepository implements LoanRepository {
  async create(input: CreateLoanRecord): Promise<Loan> {
    const result = await pool.query<LoanRow>(
      `INSERT INTO loans (user_id, friend_name, amount, due_date, receipt_path)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${columns}`,
      [input.userId, input.friendName, input.amount, input.dueDate, input.receiptPath]
    );
    const row = result.rows[0];
    if (!row) throw new Error('Loan insert returned no record.');
    return mapLoan(row);
  }

  async listByUser(userId: string): Promise<Loan[]> {
    const result = await pool.query<LoanRow>(
      `SELECT ${columns} FROM loans WHERE user_id = $1
       ORDER BY CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END,
       CASE WHEN status = 'PENDING' THEN due_date END ASC, created_at DESC`, [userId]
    );
    return result.rows.map(mapLoan);
  }

  async findById(userId: string, loanId: string): Promise<Loan | null> {
    const result = await pool.query<LoanRow>(`SELECT ${columns} FROM loans WHERE user_id = $1 AND id = $2`, [userId, loanId]);
    return result.rows[0] ? mapLoan(result.rows[0]) : null;
  }

  async markRepaid(userId: string, loanId: string): Promise<Loan | null> {
    const result = await pool.query<LoanRow>(
      `UPDATE loans SET status = 'REPAID', repaid_at = NOW()
       WHERE user_id = $1 AND id = $2 AND status = 'PENDING'
       RETURNING ${columns}`, [userId, loanId]
    );
    return result.rows[0] ? mapLoan(result.rows[0]) : null;
  }

  async getSummary(userId: string): Promise<LoanSummary> {
    const result = await pool.query<{ total_lent: number | string; total_repaid: number | string; overdue_amount: number | string; pending_count: string; repaid_count: string }>(
      `SELECT
         COALESCE(SUM(amount), 0)::float8 AS total_lent,
         COALESCE(SUM(amount) FILTER (WHERE status = 'REPAID'), 0)::float8 AS total_repaid,
         COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING' AND due_date < CURRENT_DATE), 0)::float8 AS overdue_amount,
         COUNT(*) FILTER (WHERE status = 'PENDING')::text AS pending_count,
         COUNT(*) FILTER (WHERE status = 'REPAID')::text AS repaid_count
       FROM loans WHERE user_id = $1`, [userId]
    );
    const row = result.rows[0];
    return {
      totalLent: Number(row?.total_lent ?? 0),
      totalRepaid: Number(row?.total_repaid ?? 0),
      overdueAmount: Number(row?.overdue_amount ?? 0),
      pendingCount: Number(row?.pending_count ?? 0),
      repaidCount: Number(row?.repaid_count ?? 0)
    };
  }
}
