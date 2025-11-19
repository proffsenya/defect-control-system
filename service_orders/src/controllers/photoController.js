const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { dbConnection } = require('../config/database');
const { validateAuthToken } = require('../middleware/security');
const { hasViewAccess } = require('../helpers/permissions');

// Создаем директорию для загрузки файлов, если её нет
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Настройка multer для загрузки изображений
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  // Разрешаем только изображения
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Разрешены только изображения'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Проверка прав на загрузку фотографий (только admin и engineer)
const canUploadPhotos = (user) => {
  if (!user || !user.roles) return false;
  return user.roles.includes('admin') || user.roles.includes('engineer');
};

// Загрузка фотографии к дефекту
router.post('/:orderId/photos', validateAuthToken, upload.single('photo'), async (req, res, next) => {
  try {
    if (!canUploadPhotos(req.user)) {
      // Удаляем загруженный файл, если он был загружен
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Только администраторы и инженеры могут загружать фотографии',
        },
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'Файл не был загружен',
        },
      });
    }

    const { orderId } = req.params;

    // Проверяем существование дефекта и права доступа
    const orderResult = await dbConnection.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      fs.unlinkSync(req.file.path);
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
      fs.unlinkSync(req.file.path);
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Нет доступа к этому дефекту',
        },
      });
    }

    // Сохраняем информацию о фотографии в БД
    const photoId = uuidv4();
    await dbConnection.query(
      `INSERT INTO defect_photos (id, order_id, user_id, file_path, file_name, file_size, mime_type, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        photoId,
        orderId,
        req.user.user_id,
        req.file.path,
        req.file.originalname,
        req.file.size,
        req.file.mimetype,
      ]
    );

    // Получаем информацию о загруженной фотографии
    const photoResult = await dbConnection.query(
      `SELECT dp.*, u.name as user_name, u.email as user_email
       FROM defect_photos dp
       LEFT JOIN users u ON dp.user_id = u.id
       WHERE dp.id = $1`,
      [photoId]
    );

    res.status(201).json({
      success: true,
      data: photoResult.rows[0],
    });
  } catch (error) {
    // Удаляем файл в случае ошибки
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// Получение всех фотографий дефекта
router.get('/:orderId/photos', validateAuthToken, async (req, res, next) => {
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

    // Получаем все фотографии дефекта
    const photosResult = await dbConnection.query(
      `SELECT dp.*, u.name as user_name, u.email as user_email
       FROM defect_photos dp
       LEFT JOIN users u ON dp.user_id = u.id
       WHERE dp.order_id = $1
       ORDER BY dp.created_at DESC`,
      [orderId]
    );

    res.json({
      success: true,
      data: photosResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

// Удаление фотографии
router.delete('/:orderId/photos/:photoId', validateAuthToken, async (req, res, next) => {
  try {
    if (!canUploadPhotos(req.user)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Только администраторы и инженеры могут удалять фотографии',
        },
      });
    }

    const { orderId, photoId } = req.params;

    // Получаем информацию о фотографии
    const photoResult = await dbConnection.query(
      'SELECT * FROM defect_photos WHERE id = $1 AND order_id = $2',
      [photoId, orderId]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PHOTO_NOT_FOUND',
          message: 'Фотография не найдена',
        },
      });
    }

    const photo = photoResult.rows[0];

    // Проверяем права (только автор или admin может удалить)
    if (photo.user_id !== req.user.user_id && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Нет прав на удаление этой фотографии',
        },
      });
    }

    // Удаляем файл
    if (fs.existsSync(photo.file_path)) {
      fs.unlinkSync(photo.file_path);
    }

    // Удаляем запись из БД
    await dbConnection.query('DELETE FROM defect_photos WHERE id = $1', [photoId]);

    res.json({
      success: true,
      data: {
        message: 'Фотография удалена',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Получение фотографии (для отображения)
router.get('/photos/:photoId/file', validateAuthToken, async (req, res, next) => {
  try {
    const { photoId } = req.params;

    const photoResult = await dbConnection.query(
      `SELECT dp.*, o.id as order_id
       FROM defect_photos dp
       JOIN orders o ON dp.order_id = o.id
       WHERE dp.id = $1`,
      [photoId]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PHOTO_NOT_FOUND',
          message: 'Фотография не найдена',
        },
      });
    }

    const photo = photoResult.rows[0];
    
    // Получаем полную информацию о дефекте для проверки прав
    const orderResult = await dbConnection.query(
      'SELECT * FROM orders WHERE id = $1',
      [photo.order_id]
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

    // Проверяем права доступа
    // Разрешаем доступ если:
    // 1. Пользователь может просмотреть дефект (hasViewAccess)
    // 2. Пользователь является создателем дефекта
    // 3. Пользователь является автором фотографии
    const canView = hasViewAccess(req.user, order) || 
                    order.user_id === req.user.user_id ||
                    photo.user_id === req.user.user_id;

    if (!canView) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Нет доступа к этой фотографии',
        },
      });
    }

    // Проверяем существование файла
    const filePath = path.isAbsolute(photo.file_path) 
      ? photo.file_path 
      : path.resolve(photo.file_path);
    
    if (!fs.existsSync(filePath)) {
      console.error('Файл не найден:', filePath, 'Оригинальный путь:', photo.file_path);
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'Файл не найден на сервере',
        },
      });
    }

    // Отправляем файл
    res.setHeader('Content-Type', photo.mime_type || 'image/jpeg');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(photo.file_name)}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

