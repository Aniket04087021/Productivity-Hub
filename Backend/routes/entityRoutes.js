const express = require('express');
const { protect } = require('../middleware/auth');
const { 
    createTask, 
    getTasks, 
    updateTask, 
    deleteTask 
} = require('../controllers/entityController');

const router = express.Router();

// All Task routes require authentication (using the `protect` middleware)

// GET /api/tasks (get all, search, filter) & POST /api/tasks (create)
router.route('/')
    .get(protect, getTasks)
    .post(protect, createTask);

// PUT /api/tasks/:id (update) & DELETE /api/tasks/:id (delete)
router.route('/:id')
    .put(protect, updateTask)
    .delete(protect, deleteTask);

module.exports = router;