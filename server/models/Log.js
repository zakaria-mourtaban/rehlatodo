import { DataTypes } from 'sequelize';
import sequelize from '../database/config.js';

const Log = sequelize.define('Log', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cardId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'card_id'
  },
  cardTitle: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'card_title'
  },
  actionType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'action_type'
  },
  fromColumn: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'from_column'
  },
  toColumn: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'to_column'
  },
  fromPosition: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'from_position'
  },
  toPosition: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'to_position'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id'
  }
}, {
  tableName: 'logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default Log;