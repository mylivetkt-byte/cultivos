// server/routes/tasks.js
import express from 'express';
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/taskController.js';

const router = express.Router();

// GET /api/tasks - list tasks (optionally filter by tenant, status, etc.)
router.get('/', getAllTasks);

// GET /api/tasks/:id - single task
router.get('/:id', getTaskById);

// POST /api/tasks - create task
router.post('/', createTask);

// PUT /api/tasks/:id - update task
router.put('/:id', updateTask);

// DELETE /api/tasks/:id - delete task
router.delete('/:id', deleteTask);

export default router;
