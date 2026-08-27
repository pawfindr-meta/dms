import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken } from '@/lib/auth';

// DELETE /api/tasks/[id] - Delete a dispatch task
export async function DELETE(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || !['MASTER_ADMIN', 'DISPATCHER'].includes(user.role)) {
    return NextResponse.json(
      { error: 'Unauthorized. Dispatcher or Admin privileges required.' },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id;', [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedTaskId: id });
  } catch (error) {
    console.error('Delete Task Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete task' },
      { status: 500 }
    );
  }
}