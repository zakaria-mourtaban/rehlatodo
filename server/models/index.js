import User from './User.js';
import Column from './Column.js';
import Card from './Card.js';
import Tag from './Tag.js';
import Log from './Log.js';
import RefreshToken from './RefreshToken.js';

// User associations
User.hasMany(Column, { foreignKey: 'userId' });
User.hasMany(Card, { foreignKey: 'userId' });
User.hasMany(Tag, { foreignKey: 'userId' });
User.hasMany(Log, { foreignKey: 'userId' });
User.hasMany(RefreshToken, { foreignKey: 'userId' });

// Column associations
Column.belongsTo(User, { foreignKey: 'userId' });
Column.hasMany(Card, { foreignKey: 'columnId' });

// Card associations
Card.belongsTo(User, { foreignKey: 'userId' });
Card.belongsTo(Column, { foreignKey: 'columnId' });
Card.belongsTo(Tag, { foreignKey: 'tagId' });
Card.hasMany(Log, { foreignKey: 'cardId' });

// Tag associations
Tag.belongsTo(User, { foreignKey: 'userId' });
Tag.hasMany(Card, { foreignKey: 'tagId' });

// Log associations
Log.belongsTo(User, { foreignKey: 'userId' });
Log.belongsTo(Card, { foreignKey: 'cardId' });

// RefreshToken associations
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

const models = {
  User,
  Column,
  Card,
  Tag,
  Log,
  RefreshToken
};

export {
  User,
  Column,
  Card,
  Tag,
  Log,
  RefreshToken
};

export default models;