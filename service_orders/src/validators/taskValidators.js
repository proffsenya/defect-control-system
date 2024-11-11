const { z } = require('zod');

const taskItemSchema = z.object({
  name: z.string().min(1, { message: 'Item name is required' }),
  quantity: z.number().positive({ message: 'Quantity must be positive' }),
  price: z.number().positive({ message: 'Price must be positive' }),
});

const createTaskSchema = z.object({
  items: z.array(taskItemSchema).min(1, { message: 'At least one item is required' }),
  assigned_to: z.string().uuid({ message: 'Invalid assigned_to user ID' }).optional(),
});

const updateTaskStatusSchema = z.object({
  status: z.enum(['created', 'in_progress', 'completed', 'cancelled'], {
    message: 'Invalid status',
  }),
});

module.exports = {
  createTaskSchema,
  updateTaskStatusSchema,
};

