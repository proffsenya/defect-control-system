const {
  checkRole,
  checkAnyRole,
  hasViewAccess,
  hasEditAccess,
  hasCreateAccess,
  hasAssignAccess,
} = require('../src/helpers/permissions');

describe('Permissions Helper Tests', () => {
  describe('checkRole', () => {
    test('должна вернуть true если роль присутствует', () => {
      expect(checkRole(['admin', 'user'], 'admin')).toBe(true);
    });

    test('должна вернуть false если роль отсутствует', () => {
      expect(checkRole(['user'], 'admin')).toBe(false);
    });

    test('должна вернуть false если roles не массив', () => {
      expect(checkRole(null, 'admin')).toBe(false);
      expect(checkRole(undefined, 'admin')).toBe(false);
    });
  });

  describe('checkAnyRole', () => {
    test('должна вернуть true если любая роль присутствует', () => {
      expect(checkAnyRole(['admin', 'user'], ['admin', 'manager'])).toBe(true);
    });

    test('должна вернуть false если ни одна роль не присутствует', () => {
      expect(checkAnyRole(['user'], ['admin', 'manager'])).toBe(false);
    });
  });

  describe('hasViewAccess', () => {
    const mockTask = { assigned_to: 'user-123' };

    test('админ должен иметь доступ', () => {
      const user = { user_id: 'admin-123', roles: ['admin'] };
      expect(hasViewAccess(user, mockTask)).toBe(true);
    });

    test('менеджер должен иметь доступ', () => {
      const user = { user_id: 'manager-123', roles: ['manager'] };
      expect(hasViewAccess(user, mockTask)).toBe(true);
    });

    test('инженер должен видеть только свои задачи', () => {
      const user = { user_id: 'user-123', roles: ['engineer'] };
      expect(hasViewAccess(user, mockTask)).toBe(true);
    });

    test('инженер не должен видеть чужие задачи', () => {
      const user = { user_id: 'user-456', roles: ['engineer'] };
      expect(hasViewAccess(user, mockTask)).toBe(false);
    });
  });

  describe('hasEditAccess', () => {
    const mockTask = { assigned_to: 'user-123' };

    test('админ должен иметь доступ', () => {
      const user = { user_id: 'admin-123', roles: ['admin'] };
      expect(hasEditAccess(user, mockTask)).toBe(true);
    });

    test('менеджер должен иметь доступ', () => {
      const user = { user_id: 'manager-123', roles: ['manager'] };
      expect(hasEditAccess(user, mockTask)).toBe(true);
    });

    test('инженер должен редактировать только свои задачи', () => {
      const user = { user_id: 'user-123', roles: ['engineer'] };
      expect(hasEditAccess(user, mockTask)).toBe(true);
    });

    test('инженер не должен редактировать чужие задачи', () => {
      const user = { user_id: 'user-456', roles: ['engineer'] };
      expect(hasEditAccess(user, mockTask)).toBe(false);
    });
  });

  describe('hasCreateAccess', () => {
    test('админ должен иметь доступ', () => {
      const user = { roles: ['admin'] };
      expect(hasCreateAccess(user)).toBe(true);
    });

    test('менеджер должен иметь доступ', () => {
      const user = { roles: ['manager'] };
      expect(hasCreateAccess(user)).toBe(true);
    });

    test('инженер должен иметь доступ', () => {
      const user = { roles: ['engineer'] };
      expect(hasCreateAccess(user)).toBe(true);
    });

    test('пользователь не должен иметь доступ', () => {
      const user = { roles: ['user'] };
      expect(hasCreateAccess(user)).toBe(false);
    });
  });

  describe('hasAssignAccess', () => {
    test('админ должен иметь доступ', () => {
      const user = { roles: ['admin'] };
      expect(hasAssignAccess(user)).toBe(true);
    });

    test('менеджер должен иметь доступ', () => {
      const user = { roles: ['manager'] };
      expect(hasAssignAccess(user)).toBe(true);
    });

    test('инженер не должен иметь доступ', () => {
      const user = { roles: ['engineer'] };
      expect(hasAssignAccess(user)).toBe(false);
    });
  });
});

