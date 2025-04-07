import express from 'express';
import { Column, Card, Tag } from '../models/index.js';
import sequelize from '../database/config.js';

const router = express.Router();

// Get all columns with their cards for the logged-in user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get all columns (both system columns and user-created ones)
    const columns = await Column.findAll({
      where: {
        [sequelize.Op.or]: [
          { userId },
          { userId: null }
        ]
      },
      order: [['position', 'ASC']]
    });
    
    // For each column, get its cards that belong to the user
    const result = await Promise.all(columns.map(async (column) => {
      const cards = await Card.findAll({
        where: {
          columnId: column.id,
          [sequelize.Op.or]: [
            { userId },
            { userId: null }
          ]
        },
        include: [
          {
            model: Tag,
            attributes: ['name', 'color']
          }
        ],
        order: [['position', 'ASC']]
      });
      
      const transformedCards = cards.map(card => ({
        id: card.id,
        title: card.title,
        description: card.description,
        column_id: card.columnId,
        position: card.position,
        tag_id: card.tagId,
        user_id: card.userId,
        created_at: card.created_at,
        tag_name: card.Tag ? card.Tag.name : null,
        tag_color: card.Tag ? card.Tag.color : null
      }));
      
      return {
        id: column.id,
        name: column.name,
        position: column.position,
        user_id: column.userId,
        cards: transformedCards
      };
    }));
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching columns with cards:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific column with its cards
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Get the column
    const column = await Column.findByPk(id);
    
    if (!column) {
      return res.status(404).json({ error: 'Column not found' });
    }
    
    // Get the cards for this column that belong to the user
    const cards = await Card.findAll({
      where: {
        columnId: id,
        [sequelize.Op.or]: [
          { userId },
          { userId: null }
        ]
      },
      include: [
        {
          model: Tag,
          attributes: ['name', 'color']
        }
      ],
      order: [['position', 'ASC']]
    });
    
    const transformedCards = cards.map(card => ({
      id: card.id,
      title: card.title,
      description: card.description,
      column_id: card.columnId,
      position: card.position,
      tag_id: card.tagId,
      user_id: card.userId,
      created_at: card.created_at,
      tag_name: card.Tag ? card.Tag.name : null,
      tag_color: card.Tag ? card.Tag.color : null
    }));
    
    const result = {
      id: column.id,
      name: column.name,
      position: column.position,
      user_id: column.userId,
      cards: transformedCards
    };
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching column with cards:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new column
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.userId;
    
    // Find the maximum position
    const maxPosition = await Column.max('position');
    const position = (maxPosition || 0) + 1;
    
    // Insert the new column
    const column = await Column.create({
      name,
      position,
      userId
    });
    
    res.status(201).json(column);
  } catch (err) {
    console.error('Error creating column:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a column
router.put('/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { name, position } = req.body;
    const userId = req.user.userId;
    
    // Get the current column
    const column = await Column.findByPk(id, { transaction });
    
    if (!column) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Column not found' });
    }
    
    // Check if user owns the column or if it's a system column
    if (column.userId !== null && column.userId !== userId) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Not authorized to update this column' });
    }
    
    // Handle position changes
    if (position && position !== column.position) {
      if (position < column.position) {
        // Moving up - shift columns down
        await Column.increment('position', {
          by: 1,
          where: {
            position: { [sequelize.Op.gte]: position, [sequelize.Op.lt]: column.position }
          },
          transaction
        });
      } else {
        // Moving down - shift columns up
        await Column.increment('position', {
          by: -1,
          where: {
            position: { [sequelize.Op.gt]: column.position, [sequelize.Op.lte]: position }
          },
          transaction
        });
      }
    }
    
    // Update the column
    await column.update({
      name: name || column.name,
      position: position || column.position
    }, { transaction });
    
    await transaction.commit();
    
    res.json(column);
  } catch (err) {
    await transaction.rollback();
    console.error('Error updating column:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a column
router.delete('/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Get the current column
    const column = await Column.findByPk(id, { transaction });
    
    if (!column) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Column not found' });
    }
    
    // Check if user owns the column or if it's a system column
    if (column.userId !== null && column.userId !== userId) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Not authorized to delete this column' });
    }
    
    // Delete all cards in this column first
    await Card.destroy({
      where: { columnId: id },
      transaction
    });
    
    // Delete the column
    await column.destroy({ transaction });
    
    // Close the gap in positions
    await Column.increment('position', {
      by: -1,
      where: {
        position: { [sequelize.Op.gt]: column.position }
      },
      transaction
    });
    
    await transaction.commit();
    
    res.json({ message: 'Column deleted' });
  } catch (err) {
    await transaction.rollback();
    console.error('Error deleting column:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;