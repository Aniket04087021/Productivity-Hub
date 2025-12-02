const asyncHandler = require('express-async-handler');
const Task = require('../models/Task');

// --- C: Create Task ---
/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Private
 */
const createTask = asyncHandler(async (req, res) => {
    const { title, description, priority } = req.body;

    if (!title) {
        res.status(400);
        throw new Error('Task must have a title');
    }

    const task = await Task.create({
        title,
        description,
        priority,
        user: req.userId, // Link the task to the logged-in user
    });

    res.status(201).json(task);
});

// --- R: Read Tasks (Get All, Search, Filter) ---
/**
 * @desc    Get all tasks for the logged-in user, with search/filter
 * @route   GET /api/tasks
 * @access  Private
 */
const getTasks = asyncHandler(async (req, res) => {
    const { search, isCompleted, priority } = req.query;
    
    // Base filter: Only tasks belonging to the logged-in user
    const filter = { user: req.userId }; 

    // Add search functionality (case-insensitive title/description search)
    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
        ];
    }

    // Add filter by completion status
    if (isCompleted !== undefined) {
        filter.isCompleted = isCompleted === 'true'; 
    }

    // Add filter by priority
    if (priority) {
        filter.priority = priority; 
    }

    // Sort by creation date (newest first)
    const tasks = await Task.find(filter).sort({ createdAt: -1 });

    res.json(tasks);
});


// --- U: Update Task ---
/**
 * @desc    Update a task
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
const updateTask = asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id);

    if (task) {
        // SECURITY CHECK: Ensure the task belongs to the authenticated user
        if (task.user.toString() !== req.userId.toString()) {
            res.status(401);
            throw new Error('Not authorized to update this task');
        }

        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.isCompleted = req.body.isCompleted !== undefined ? req.body.isCompleted : task.isCompleted;
        task.priority = req.body.priority || task.priority;
        
        const updatedTask = await task.save();
        res.json(updatedTask);
    } else {
        res.status(404);
        throw new Error('Task not found');
    }
});

// --- D: Delete Task ---
/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
const deleteTask = asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id);

    if (task) {
        // SECURITY CHECK: Ensure the task belongs to the authenticated user
        if (task.user.toString() !== req.userId.toString()) {
            res.status(401);
            throw new Error('Not authorized to delete this task');
        }

        await Task.deleteOne({ _id: task._id }); // Use deleteOne to avoid deprecation warning
        res.json({ message: 'Task removed' });
    } else {
        res.status(404);
        throw new Error('Task not found');
    }
});

module.exports = { createTask, getTasks, updateTask, deleteTask };