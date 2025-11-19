const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { dbConnection } = require('../config/database');
const { validateAuthToken } = require('../middleware/security');
const { createTaskSchema, updateTaskStatusSchema } = require('../validators/taskValidators');
const { eventDispatcher, EVENT_TYPES } = require('../core/EventDispatcher');
const { hasViewAccess, hasEditAccess, hasCreateAccess, hasAssignAccess } = require('../helpers/permissions');
const ExcelJS = require('exceljs');

const checkUserById = async (userId) => {
  try {
    const result = await dbConnection.query('SELECT id, roles FROM users WHERE id = $1', [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    return null;
  }
};

router.post('/', validateAuthToken, async (req, res, next) => {
  try {
    if (!hasCreateAccess(req.user)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to create defects',
        },
      });
    }

    const validatedData = createTaskSchema.parse(req.body);
    const { items, assigned_to } = validatedData;

    let assignedToUserId = assigned_to;
    
    if (assigned_to && hasAssignAccess(req.user)) {
      const assignedUser = await checkUserById(assigned_to);
      if (!assignedUser) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Assigned user does not exist',
          },
        });
      }
      if (!assignedUser.roles || !assignedUser.roles.includes('engineer')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ASSIGNMENT',
            message: 'Defect can only be assigned to an engineer',
          },
        });
      }
      assignedToUserId = assigned_to;
    } else if (assigned_to && !hasAssignAccess(req.user)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to assign defects to other users',
        },
      });
    } else {
      if (req.user.roles && req.user.roles.includes('engineer')) {
        assignedToUserId = req.user.user_id;
      } else if (hasAssignAccess(req.user)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ASSIGNMENT_REQUIRED',
            message: 'You must assign the defect to an engineer',
          },
        });
      } else {
        assignedToUserId = req.user.user_id;
      }
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taskId = uuidv4();

    await dbConnection.query(
      'INSERT INTO orders (id, user_id, assigned_to, items, status, total, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())',
      [taskId, req.user.user_id, assignedToUserId, JSON.stringify(items), 'created', total]
    );

    // Записываем начальный статус в историю
    try {
      const initialHistoryId = uuidv4();
      await dbConnection.query(
        `INSERT INTO defect_status_history (id, order_id, user_id, old_status, new_status, created_at)
         VALUES ($1, $2, $3, NULL, $4, NOW())`,
        [initialHistoryId, taskId, req.user.user_id, 'created']
      );
    } catch (historyError) {
      // Если таблица не существует, просто логируем и продолжаем
      if (historyError.code === '42P01') {
        console.warn('Таблица defect_status_history не существует, пропускаем запись в историю');
      } else {
        console.error('Ошибка при записи в историю статусов:', historyError);
      }
    }

    const result = await dbConnection.query(
      `SELECT o.*, u.name as assigned_to_name, u.email as assigned_to_email 
       FROM orders o 
       LEFT JOIN users u ON o.assigned_to = u.id 
       WHERE o.id = $1`,
      [taskId]
    );

    const task = result.rows[0];

    eventDispatcher.emitEvent(EVENT_TYPES.TASK_CREATED, {
      orderId: task.id,
      userId: task.user_id,
      assignedTo: task.assigned_to,
      items: task.items,
      total: task.total,
      status: task.status,
    });

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        },
      });
    }
    next(error);
  }
});

router.get('/:id', validateAuthToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await dbConnection.query(
      `SELECT o.*, u.name as assigned_to_name, u.email as assigned_to_email 
       FROM orders o 
       LEFT JOIN users u ON o.assigned_to = u.id 
       WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    const task = result.rows[0];

    if (!hasViewAccess(req.user, task)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
});

// Экспорт в Excel (должен быть определен перед /:id роутами)
router.get('/export/excel', validateAuthToken, async (req, res, next) => {
  try {
    if (!req.user.roles || (!req.user.roles.includes('manager') && !req.user.roles.includes('admin'))) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    const status = req.query.status;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const validSortFields = ['created_at', 'updated_at', 'total', 'status'];
    const orderBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';

    let query = `SELECT o.*, u.name as assigned_to_name, u.email as assigned_to_email 
                 FROM orders o 
                 LEFT JOIN users u ON o.assigned_to = u.id`;
    const values = [];
    let whereConditions = [];

    if (status) {
      whereConditions.push(`o.status = $${values.length + 1}`);
      values.push(status);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ` ORDER BY o.${orderBy} ${sortOrder}`;

    const tasksResult = await dbConnection.query(query, values);
    const tasks = tasksResult.rows;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Дефекты');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Статус', key: 'status', width: 15 },
      { header: 'Инженер', key: 'assigned_to_name', width: 25 },
      { header: 'Email инженера', key: 'assigned_to_email', width: 30 },
      { header: 'Количество элементов', key: 'items_count', width: 20 },
      { header: 'Сумма', key: 'total', width: 15 },
      { header: 'Дата создания', key: 'created_at', width: 20 },
      { header: 'Дата обновления', key: 'updated_at', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    tasks.forEach((task) => {
      const items = Array.isArray(task.items) ? task.items : [];
      worksheet.addRow({
        id: task.id,
        status: task.status === 'created' ? 'Создан' :
                task.status === 'in_progress' ? 'В работе' :
                task.status === 'completed' ? 'Завершен' :
                task.status === 'cancelled' ? 'Отменен' : task.status,
        assigned_to_name: task.assigned_to_name || 'Не назначен',
        assigned_to_email: task.assigned_to_email || '',
        items_count: items.length,
        total: parseFloat(task.total),
        created_at: new Date(task.created_at).toLocaleString('ru-RU'),
        updated_at: new Date(task.updated_at).toLocaleString('ru-RU'),
      });
    });

    worksheet.getColumn('total').numFmt = '#,##0.00 ₽';

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=defects_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

router.get('/', validateAuthToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const validSortFields = ['created_at', 'updated_at', 'total', 'status'];
    const orderBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';

    let query = `SELECT o.*, u.name as assigned_to_name, u.email as assigned_to_email 
                 FROM orders o 
                 LEFT JOIN users u ON o.assigned_to = u.id`;
    let countQuery = 'SELECT COUNT(*) FROM orders o';
    const values = [];
    let whereConditions = [];

    if (req.user.roles && req.user.roles.includes('engineer')) {
      whereConditions.push(`o.assigned_to = $${values.length + 1}`);
      values.push(req.user.user_id);
    }

    if (status) {
      whereConditions.push(`o.status = $${values.length + 1}`);
      values.push(status);
    }

    if (whereConditions.length > 0) {
      const whereClause = ' WHERE ' + whereConditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ` ORDER BY o.${orderBy} ${sortOrder} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

    const [tasksResult, countResult] = await Promise.all([
      dbConnection.query(query, [...values, limit, offset]),
      dbConnection.query(countQuery, values),
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        orders: tasksResult.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', validateAuthToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = updateTaskStatusSchema.parse(req.body);
    const { status } = validatedData;

    const taskResult = await dbConnection.query(
      `SELECT o.*, u.name as assigned_to_name, u.email as assigned_to_email 
       FROM orders o 
       LEFT JOIN users u ON o.assigned_to = u.id 
       WHERE o.id = $1`,
      [id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    const task = taskResult.rows[0];

    if (!hasEditAccess(req.user, task)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    const oldStatus = task.status;

    await dbConnection.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id]
    );

    // Записываем изменение статуса в историю
    try {
      const historyId = uuidv4();
      await dbConnection.query(
        `INSERT INTO defect_status_history (id, order_id, user_id, old_status, new_status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [historyId, id, req.user.user_id, oldStatus, status]
      );
    } catch (historyError) {
      // Если таблица не существует, просто логируем и продолжаем
      if (historyError.code === '42P01') {
        console.warn('Таблица defect_status_history не существует, пропускаем запись в историю');
      } else {
        console.error('Ошибка при записи в историю статусов:', historyError);
      }
    }

    const result = await dbConnection.query(
      `SELECT o.*, u.name as assigned_to_name, u.email as assigned_to_email 
       FROM orders o 
       LEFT JOIN users u ON o.assigned_to = u.id 
       WHERE o.id = $1`,
      [id]
    );

    const updatedTask = result.rows[0];

    eventDispatcher.emitEvent(EVENT_TYPES.TASK_STATUS_CHANGED, {
      orderId: updatedTask.id,
      userId: updatedTask.user_id,
      assignedTo: updatedTask.assigned_to,
      oldStatus,
      newStatus: updatedTask.status,
    });

    res.json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        },
      });
    }
    next(error);
  }
});

router.delete('/:id', validateAuthToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const taskResult = await dbConnection.query(
      `SELECT o.*, u.name as assigned_to_name, u.email as assigned_to_email 
       FROM orders o 
       LEFT JOIN users u ON o.assigned_to = u.id 
       WHERE o.id = $1`,
      [id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    const task = taskResult.rows[0];

    if (!hasEditAccess(req.user, task)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    const oldStatus = task.status;

    await dbConnection.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
      ['cancelled', id]
    );

    // Записываем отмену в историю
    try {
      const cancelHistoryId = uuidv4();
      await dbConnection.query(
        `INSERT INTO defect_status_history (id, order_id, user_id, old_status, new_status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [cancelHistoryId, id, req.user.user_id, oldStatus, 'cancelled']
      );
    } catch (historyError) {
      // Если таблица не существует, просто логируем и продолжаем
      if (historyError.code === '42P01') {
        console.warn('Таблица defect_status_history не существует, пропускаем запись в историю');
      } else {
        console.error('Ошибка при записи в историю статусов:', historyError);
      }
    }

    eventDispatcher.emitEvent(EVENT_TYPES.TASK_CANCELLED, {
      orderId: task.id,
      userId: task.user_id,
      assignedTo: task.assigned_to,
      oldStatus,
      newStatus: 'cancelled',
    });

    res.json({
      success: true,
      data: {
        message: 'Order cancelled successfully',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Получение истории изменений статуса дефекта
router.get('/:id/status-history', validateAuthToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Проверяем существование дефекта и права доступа
    const taskResult = await dbConnection.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    const task = taskResult.rows[0];

    if (!hasViewAccess(req.user, task)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    // Получаем историю изменений статуса
    // Используем IF EXISTS для проверки существования таблицы
    let historyResult;
    try {
      historyResult = await dbConnection.query(
        `SELECT dsh.*, u.name as user_name, u.email as user_email
         FROM defect_status_history dsh
         LEFT JOIN users u ON dsh.user_id = u.id
         WHERE dsh.order_id = $1
         ORDER BY dsh.created_at DESC`,
        [id]
      );
    } catch (dbError) {
      // Если таблица не существует, возвращаем пустой массив
      if (dbError.code === '42P01') { // relation does not exist
        console.warn('Таблица defect_status_history не существует, возвращаем пустую историю');
        return res.json({
          success: true,
          data: [],
        });
      }
      throw dbError;
    }

    res.json({
      success: true,
      data: historyResult.rows,
    });
  } catch (error) {
    console.error('Ошибка при получении истории статусов:', error);
    next(error);
  }
});

router.get('/export/excel', validateAuthToken, async (req, res, next) => {
  try {
    if (!req.user.roles || (!req.user.roles.includes('manager') && !req.user.roles.includes('admin'))) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    const status = req.query.status;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const validSortFields = ['created_at', 'updated_at', 'total', 'status'];
    const orderBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';

    let query = `SELECT o.*, u.name as assigned_to_name, u.email as assigned_to_email 
                 FROM orders o 
                 LEFT JOIN users u ON o.assigned_to = u.id`;
    const values = [];
    let whereConditions = [];

    if (status) {
      whereConditions.push(`o.status = $${values.length + 1}`);
      values.push(status);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ` ORDER BY o.${orderBy} ${sortOrder}`;

    const tasksResult = await dbConnection.query(query, values);
    const tasks = tasksResult.rows;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Дефекты');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Статус', key: 'status', width: 15 },
      { header: 'Инженер', key: 'assigned_to_name', width: 25 },
      { header: 'Email инженера', key: 'assigned_to_email', width: 30 },
      { header: 'Количество элементов', key: 'items_count', width: 20 },
      { header: 'Сумма', key: 'total', width: 15 },
      { header: 'Дата создания', key: 'created_at', width: 20 },
      { header: 'Дата обновления', key: 'updated_at', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    tasks.forEach((task) => {
      const items = Array.isArray(task.items) ? task.items : [];
      worksheet.addRow({
        id: task.id,
        status: task.status === 'created' ? 'Создан' :
                task.status === 'in_progress' ? 'В работе' :
                task.status === 'completed' ? 'Завершен' :
                task.status === 'cancelled' ? 'Отменен' : task.status,
        assigned_to_name: task.assigned_to_name || 'Не назначен',
        assigned_to_email: task.assigned_to_email || '',
        items_count: items.length,
        total: parseFloat(task.total),
        created_at: new Date(task.created_at).toLocaleString('ru-RU'),
        updated_at: new Date(task.updated_at).toLocaleString('ru-RU'),
      });
    });

    worksheet.getColumn('total').numFmt = '#,##0.00 ₽';

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=defects_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;

