const mongoose = require('mongoose');

const taskSchema = mongoose.Schema(
    {
        // Reference to the User who created the task (Required for ownership/security)
        user: { 
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        title: {
            type: String,
            required: [true, 'Please add a title'],
            trim: true,
        },
        description: {
            type: String,
            required: false,
        },
        isCompleted: {
            type: Boolean,
            default: false,
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High'],
            default: 'Medium',
        }
    },
    {
        timestamps: true,
    }
);

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;