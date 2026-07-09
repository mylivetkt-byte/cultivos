// server/controllers/taskController.js
import pool from '../db.js';

/** Helper to parse optional query params */
function buildFilters(query) {
  const filters = [];
  const values = [];
  if (query.tenantId) {
    filters.push('tenant_id = ?');
    values.push(query.tenantId);
  }
  if (query.status) {
    filters.push('status = ?');
    values.push(query.status);
  }
  if (query.assignedTo) {
    filters.push('assigned_to = ?');
    values.push(query.assignedTo);
  }
  return { whereClause: filters.length ? `WHERE ${filters.join(' AND ')}` : '', values };
}

export async function getAllTasks(req, res) {
  try {
    const { whereClause, values } = buildFilters(req.query);
    const [rows] = await pool.query(`SELECT * FROM tasks ${whereClause} ORDER BY created_at DESC`, values);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function getTaskById(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const task = rows[0];
    // fetch recurrence if exists
    const [recRows] = await pool.query('SELECT * FROM task_recurrences WHERE task_id = ?', [id]);
    task.recurrence = recRows[0] || null;
    res.json(task);
  } catch (err) {
    console.error('Error fetching task:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function createTask(req, res) {
  const {
    title,
    description = null,
    assigned_to = null,
    tenant_id,
    status = 'pending',
    priority = 0,
    start_at = null,
    end_at = null,
    recurrence // { frequency, cron_expression }
  } = req.body;
  if (!title || !tenant_id) {
    return res.status(400).json({ error: 'title and tenant_id are required' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO tasks (title, description, assigned_to, tenant_id, status, priority, start_at, end_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [title, description, assigned_to, tenant_id, status, priority, start_at, end_at]
    );
    const taskId = result.insertId;
    // handle recurrence if supplied
    if (recurrence && recurrence.frequency) {
      await conn.query(
        `INSERT INTO task_recurrences (task_id, frequency, cron_expression) VALUES (?,?,?)`,
        [taskId, recurrence.frequency, recurrence.cron_expression || null]
      );
    }
    await conn.commit();
    const [newTaskRows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    res.status(201).json(newTaskRows[0]);
  } catch (err) {
    await conn.rollback();
    console.error('Error creating task:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}

export async function updateTask(req, res) {
  const { id } = req.params;
  const {
    title,
    description,
    assigned_to,
    tenant_id,
    status,
    priority,
    start_at,
    end_at,
    recurrence // optional replacement
  } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Build dynamic SET clause
    const fields = [];
    const values = [];
    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (assigned_to !== undefined) { fields.push('assigned_to = ?'); values.push(assigned_to); }
    if (tenant_id !== undefined) { fields.push('tenant_id = ?'); values.push(tenant_id); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
    if (start_at !== undefined) { fields.push('start_at = ?'); values.push(start_at); }
    if (end_at !== undefined) { fields.push('end_at = ?'); values.push(end_at); }
    if (fields.length) {
      await conn.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
    }
    // Recurrence handling: replace existing record if supplied, otherwise leave untouched
    if (recurrence) {
      // delete any existing recurrence for this task
      await conn.query('DELETE FROM task_recurrences WHERE task_id = ?', [id]);
      if (recurrence.frequency) {
        await conn.query(
          `INSERT INTO task_recurrences (task_id, frequency, cron_expression) VALUES (?,?,?)`,
          [id, recurrence.frequency, recurrence.cron_expression || null]
        );
      }
    }
    await conn.commit();
    const [updatedRows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    res.json(updatedRows[0] || { message: 'Task updated' });
  } catch (err) {
    await conn.rollback();
    console.error('Error updating task:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}

export async function deleteTask(req, res) {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: err.message });
  }
}
