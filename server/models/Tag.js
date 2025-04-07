import { DataTypes } from 'sequelize';
import sequelize from '../database/config.js';

const Tag = sequelize.define('Tag', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id'
  }
}, {
  tableName: 'tags',
  timestamps: false
});

export default Tag;