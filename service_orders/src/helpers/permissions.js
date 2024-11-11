const checkRole = (userRoles, requiredRole) => {
  if (!userRoles || !Array.isArray(userRoles)) return false;
  return userRoles.includes(requiredRole);
};

const checkAnyRole = (userRoles, requiredRoles) => {
  if (!userRoles || !Array.isArray(userRoles)) return false;
  return requiredRoles.some(role => userRoles.includes(role));
};

const hasViewAccess = (user, task) => {
  if (checkRole(user.roles, 'admin')) return true;
  if (checkRole(user.roles, 'manager')) return true;
  if (checkRole(user.roles, 'director')) return true;
  if (checkRole(user.roles, 'customer')) return true;
  if (checkRole(user.roles, 'engineer')) {
    return task.assigned_to === user.user_id;
  }
  return false;
};

const hasEditAccess = (user, task) => {
  if (checkRole(user.roles, 'admin')) return true;
  if (checkRole(user.roles, 'manager')) return true;
  if (checkRole(user.roles, 'engineer')) {
    return task.assigned_to === user.user_id;
  }
  return false;
};

const hasCreateAccess = (user) => {
  return checkAnyRole(user.roles, ['admin', 'manager', 'engineer']);
};

const hasAssignAccess = (user) => {
  return checkAnyRole(user.roles, ['admin', 'manager']);
};

module.exports = {
  checkRole,
  checkAnyRole,
  hasViewAccess,
  hasEditAccess,
  hasCreateAccess,
  hasAssignAccess,
};

