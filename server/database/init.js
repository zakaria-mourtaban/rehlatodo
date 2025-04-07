import sequelize from './config.js';
import models from '../models/index.js';
import { Column, Tag } from '../models/index.js';

const initDatabase = async () => {
  try {
    // Sync all models with database
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully');

    // Check if default columns exist
    const columnsCount = await Column.count();
    if (columnsCount === 0) {
      // Create default columns
      await Column.bulkCreate([
        { name: 'Backlog', position: 1 },
        { name: 'To Do', position: 2 },
        { name: 'Done', position: 3 }
      ]);
      console.log('Default columns created');
    }

    // Check if default tags exist
    const tagsCount = await Tag.count();
    if (tagsCount === 0) {
      // Create default tags
      await Tag.bulkCreate([
        { name: 'Shopping', color: '#4CAF50' },
        { name: 'Cleaning', color: '#2196F3' }
      ]);
      console.log('Default tags created');
    }

    console.log('Database setup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

// Run the initialization
initDatabase();