const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { dbConnection } = require('../config/database');
const { validateAuthToken } = require('../middleware/security');
const { hasViewAccess } = require('../helpers/permissions');
const { z } = require('zod');

// Схема валидации комментария
const createCommentSchema = z.object({
  comment_text: z.string().min(1, 'Комментарий не может быть пустым').max(5000, 'Комментарий слишком длинный'),
});

// Проверка прав на создание комментариев (все кроме user)
const canCreateComment = (user) => {
  if (!user || !user.roles) return false;
  // Разрешаем всем ролям кроме 'user'
  return user.roles.some(role => 
    ['admin', 'manager', 'engineer', 'director', 'customer'].includes(role)
  );
};

// Создание комментария к дефекту
router.post('/:orderId/comments', validateAuthToken, async (req, res, next) => {
  try {
    if (!canCreateComment(req.user)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Пользователи с ролью "user" не могут оставлять комментарии',
        },
      });
    }

    const { orderId } = req.params;
    const validatedData = createCommentSchema.parse(req.body);
    const { comment_text } = validatedData;

    // Проверяем существование дефекта и права доступа
    const orderResult = await dbConnection.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Дефект не найден',
        },
      });
    }

    const order = orderResult.rows[0];

    if (!hasViewAccess(req.user, order)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Нет доступа к этому дефекту',
        },
      });
    }

    // Создаем комментарий
    const commentId = uuidv4();
    await dbConnection.query(
      `INSERT INTO defect_comments (id, order_id, user_id, comment_text, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [commentId, orderId, req.user.user_id, comment_text]
    );

    // Получаем созданный комментарий с информацией о пользователе
    const commentResult = await dbConnection.query(
      `SELECT dc.*, u.name as user_name, u.email as user_email
       FROM defect_comments dc
       LEFT JOIN users u ON dc.user_id = u.id
       WHERE dc.id = $1`,
      [commentId]
    );

    res.status(201).json({
      success: true,
      data: commentResult.rows[0],
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

// Получение всех комментариев дефекта
router.get('/:orderId/comments', validateAuthToken, async (req, res, next) => {
  try {
    const { orderId } = req.params;

    // Проверяем существование дефекта и права доступа
    const orderResult = await dbConnection.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Дефект не найден',
        },
      });
    }

    const order = orderResult.rows[0];

    if (!hasViewAccess(req.user, order)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Нет доступа к этому дефекту',
        },
      });
    }

    // Получаем все комментарии дефекта
    const commentsResult = await dbConnection.query(
      `SELECT dc.*, u.name as user_name, u.email as user_email
       FROM defect_comments dc
       LEFT JOIN users u ON dc.user_id = u.id
       WHERE dc.order_id = $1
       ORDER BY dc.created_at ASC`,
      [orderId]
    );

    res.json({
      success: true,
      data: commentsResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

// Обновление комментария
router.patch('/:orderId/comments/:commentId', validateAuthToken, async (req, res, next) => {
  try {
    const { orderId, commentId } = req.params;
    const validatedData = createCommentSchema.parse(req.body);
    const { comment_text } = validatedData;

    // Получаем комментарий
    const commentResult = await dbConnection.query(
      'SELECT * FROM defect_comments WHERE id = $1 AND order_id = $2',
      [commentId, orderId]
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COMMENT_NOT_FOUND',
          message: 'Комментарий не найден',
        },
      });
    }

    const comment = commentResult.rows[0];

    // Проверяем права (только автор или admin может редактировать)
    if (comment.user_id !== req.user.user_id && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Нет прав на редактирование этого комментария',
        },
      });
    }

    // Обновляем комментарий
    await dbConnection.query(
      'UPDATE defect_comments SET comment_text = $1, updated_at = NOW() WHERE id = $2',
      [comment_text, commentId]
    );

    // Получаем обновленный комментарий
    const updatedCommentResult = await dbConnection.query(
      `SELECT dc.*, u.name as user_name, u.email as user_email
       FROM defect_comments dc
       LEFT JOIN users u ON dc.user_id = u.id
       WHERE dc.id = $1`,
      [commentId]
    );

    res.json({
      success: true,
      data: updatedCommentResult.rows[0],
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

// Удаление комментария
router.delete('/:orderId/comments/:commentId', validateAuthToken, async (req, res, next) => {
  try {
    const { orderId, commentId } = req.params;

    // Получаем комментарий
    const commentResult = await dbConnection.query(
      'SELECT * FROM defect_comments WHERE id = $1 AND order_id = $2',
      [commentId, orderId]
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COMMENT_NOT_FOUND',
          message: 'Комментарий не найден',
        },
      });
    }

    const comment = commentResult.rows[0];

    // Проверяем права (только автор или admin может удалить)
    if (comment.user_id !== req.user.user_id && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Нет прав на удаление этого комментария',
        },
      });
    }

    // Удаляем комментарий
    await dbConnection.query('DELETE FROM defect_comments WHERE id = $1', [commentId]);

    res.json({
      success: true,
      data: {
        message: 'Комментарий удален',
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

