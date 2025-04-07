import { DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import sequelize from '../database/config.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Method to check if password is valid
User.prototype.isValidPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Hook to hash password before save
User.beforeCreate(async (user) => {
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
});

// Hook to hash password before update (if changed)
User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

export default User;