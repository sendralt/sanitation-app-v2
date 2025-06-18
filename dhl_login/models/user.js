const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/sequelize');

class User extends Model {}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 30], // Example length validation
      // Add custom validator for allowed characters if needed
      // is: /^[a-zA-Z0-9_]+$/i // Example: alphanumeric and underscore
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  securityQuestion1Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  securityAnswer1Hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  securityQuestion2Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  securityAnswer2Hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  passwordResetAttemptCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  lastPasswordResetAttempt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('user', 'manager', 'admin', 'compliance'),
    defaultValue: 'user',
    allowNull: false,
  },
  managerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // createdAt and updatedAt are automatically managed by Sequelize by default
}, {
  sequelize,
  modelName: 'User',
  // tableName: 'users', // Optional: by default, Sequelize pluralizes the model name
  timestamps: true, // This enables createdAt and updatedAt
});

// Define associations
User.associate = function(models) {
  // Self-referencing association for manager-employee relationship
  User.belongsTo(User, {
    as: 'manager',
    foreignKey: 'managerId',
    allowNull: true
  });

  User.hasMany(User, {
    as: 'directReports',
    foreignKey: 'managerId'
  });
};

// Instance methods
User.prototype.isManager = function() {
  return this.role === 'manager' || this.role === 'admin';
};

User.prototype.isCompliance = function() {
  return this.role === 'compliance' || this.role === 'manager' || this.role === 'admin';
};

User.prototype.canManageUser = function(targetUserId) {
  if (this.role === 'admin') return true;
  if (this.role === 'manager') {
    // Can manage direct reports
    return this.directReports && this.directReports.some(user => user.id === targetUserId);
  }
  return false;
};

// Class methods
User.findByRole = function(role) {
  return this.findAll({ where: { role } });
};

User.findManagersWithTeams = function() {
  return this.findAll({
    where: { role: ['manager', 'admin'] },
    include: [{
      model: User,
      as: 'directReports',
      attributes: ['id', 'username', 'firstName', 'lastName', 'role']
    }]
  });
};

User.findComplianceOfficers = function() {
  return this.findAll({
    where: { role: ['compliance', 'admin'] },
    attributes: ['id', 'username', 'firstName', 'lastName', 'role', 'department']
  });
};

module.exports = User;
