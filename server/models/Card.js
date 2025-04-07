import { DataTypes } from 'sequelize';
import sequelize from '../database/config.js';

const Card = sequelize.define('Card', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  columnId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'column_id'
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tagId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'tag_id'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id'
  }
}, {
  tableName: 'cards',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default Card;