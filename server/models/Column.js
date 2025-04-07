import { DataTypes } from 'sequelize';
import sequelize from '../database/config.js';

const Column = sequelize.define('Column', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id'
  }
}, {
  tableName: 'columns',
  timestamps: false
});

export default Column;