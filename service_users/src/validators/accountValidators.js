const { z } = require('zod');

const signupValidation = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
});

const signinValidation = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

const updateAccountValidation = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }).optional(),
  email: z.string().email({ message: 'Invalid email format' }).optional(),
});

const updateUserRolesValidation = z.object({
  roles: z.array(z.enum(['user', 'engineer', 'manager', 'director', 'customer', 'admin'], {
    message: 'Invalid role',
  })).min(1, { message: 'At least one role is required' }),
});

module.exports = {
  signupValidation,
  signinValidation,
  updateAccountValidation,
  updateUserRolesValidation,
};

