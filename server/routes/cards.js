import express from 'express';
import { Card, Column, Tag, Log } from '../models/index.js';
import sequelize from '../database/config.js';

const router = express.Router();

// Get all cards for logged-in user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const cards = await Card.findAll({
      where: {
        [sequelize.Op.or]: [
          { userId },
          { userId: null }
        ]
      },
      include: [
        {
          model: Column,
          attributes: ['name'],
        },
        {
          model: Tag,
          attributes: ['name', 'color'],
        }
      ],
      order: [
        ['columnId', 'ASC'],
        ['position', 'ASC']
      ]
    });
    
    // Transform the results to match the expected format
    const transformedCards = cards.map(card => ({
      id: card.id,
      title: card.title,
      description: card.description,
      column_id: card.columnId,
      position: card.position,
      tag_id: card.tagId,
      user_id: card.userId,
      created_at: card.created_at,
      column_name: card.Column ? card.Column.name : null,
      tag_name: card.Tag ? card.Tag.name : null,
      tag_color: card.Tag ? card.Tag.color : null
    }));
    
    res.json(transformedCards);
  } catch (err) {
    console.error('Error fetching cards:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific card
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const card = await Card.findByPk(id, {
      include: [
        {
          model: Column,
          attributes: ['name'],
        },
        {
          model: Tag,
          attributes: ['name', 'color'],
        }
      ]
    });
    
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    // Transform the result to match the expected format
    const transformedCard = {
      id: card.id,
      title: card.title,
      description: card.description,
      column_id: card.columnId,
      position: card.position,
      tag_id: card.tagId,
      user_id: card.userId,
      created_at: card.created_at,
      column_name: card.Column ? card.Column.name : null,
      tag_name: card.Tag ? card.Tag.name : null,
      tag_color: card.Tag ? card.Tag.color : null
    };
    
    res.json(transformedCard);
  } catch (err) {
    console.error('Error fetching card:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new card
router.post('/', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { title, description, column_id, tag_id } = req.body;
    const userId = req.user.userId;
    
    // Find the maximum position in the column
    const maxPosition = await Card.max('position', { 
      where: { columnId: column_id },
      transaction
    });
    
    const position = (maxPosition || 0) + 1;
    
    // Insert the new card
    const card = await Card.create({
      title,
      description,
      columnId: column_id,
      position,
      tagId: tag_id,
      userId
    }, { transaction });
    
    // Get column name for logging
    const column = await Column.findByPk(column_id, { transaction });
    
    if (!column) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Column not found' });
    }
    
    // Create a log entry
    await Log.create({
      cardId: card.id,
      cardTitle: title,
      actionType: 'created',
      toColumn: column.name,
      toPosition: position,
      userId
    }, { transaction });
    
    await transaction.commit();
    
    res.status(201).json(card);
  } catch (err) {
    await transaction.rollback();
    console.error('Error creating card:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a card
router.put('/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { title, description, column_id, position, tag_id } = req.body;
    const userId = req.user.userId;
    
    // Get the current card data
    const currentCard = await Card.findByPk(id, {
      include: [
        {
          model: Column,
          attributes: ['name'],
        }
      ],
      transaction
    });
    
    if (!currentCard) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Card not found' });
    }
    
    const fromColumn = currentCard.Column.name;
    const fromPosition = currentCard.position;
    
    // Get new column name if changed
    let toColumn = fromColumn;
    if (column_id !== currentCard.columnId) {
      const newColumn = await Column.findByPk(column_id, { transaction });
      if (!newColumn) {
        await transaction.rollback();
        return res.status(404).json({ error: 'New column not found' });
      }
      toColumn = newColumn.name;
    }
    
    // Handle position changes within the same column
    if (column_id === currentCard.columnId && position !== currentCard.position) {
      if (position < currentCard.position) {
        // Moving up - shift cards down
        await Card.increment('position', { 
          by: 1,
          where: { 
            columnId: column_id,
            position: { [sequelize.Op.gte]: position, [sequelize.Op.lt]: currentCard.position }
          },
          transaction
        });
      } else {
        // Moving down - shift cards up
        await Card.increment('position', { 
          by: -1,
          where: { 
            columnId: column_id,
            position: { [sequelize.Op.gt]: currentCard.position, [sequelize.Op.lte]: position }
          },
          transaction
        });
      }
    } 
    // Handle moving to a different column
    else if (column_id !== currentCard.columnId) {
      // Make space in the new column
      await Card.increment('position', { 
        by: 1,
        where: { 
          columnId: column_id,
          position: { [sequelize.Op.gte]: position }
        },
        transaction
      });
      
      // Close gap in the old column
      await Card.increment('position', { 
        by: -1,
        where: { 
          columnId: currentCard.columnId,
          position: { [sequelize.Op.gt]: currentCard.position }
        },
        transaction
      });
    }
    
    // Update the card
    await currentCard.update({
      title,
      description,
      columnId: column_id,
      position,
      tagId: tag_id
    }, { transaction });
    
    // Determine action type for logging
    let actionType;
    if (column_id !== currentCard.columnId) {
      actionType = 'moved_column';
    } else if (position !== currentCard.position) {
      actionType = position < currentCard.position ? 'moved_up' : 'moved_down';
    } else {
      actionType = 'updated';
    }
    
    // Create a log entry
    await Log.create({
      cardId: id,
      cardTitle: title,
      actionType,
      fromColumn,
      toColumn,
      fromPosition,
      toPosition: position,
      userId
    }, { transaction });
    
    await transaction.commit();
    
    // Refresh the card data
    const updatedCard = await Card.findByPk(id, {
      include: [
        {
          model: Column,
          attributes: ['name'],
        },
        {
          model: Tag,
          attributes: ['name', 'color'],
        }
      ]
    });
    
    res.json(updatedCard);
  } catch (err) {
    await transaction.rollback();
    console.error('Error updating card:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a card
router.delete('/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Get the current card data
    const currentCard = await Card.findByPk(id, {
      include: [
        {
          model: Column,
          attributes: ['name'],
        }
      ],
      transaction
    });
    
    if (!currentCard) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Card not found' });
    }
    
    // Delete the card
    await currentCard.destroy({ transaction });
    
    // Close gap in the column
    await Card.increment('position', { 
      by: -1,
      where: { 
        columnId: currentCard.columnId,
        position: { [sequelize.Op.gt]: currentCard.position }
      },
      transaction
    });
    
    // Create a log entry
    await Log.create({
      cardId: id,
      cardTitle: currentCard.title,
      actionType: 'deleted',
      fromColumn: currentCard.Column.name,
      userId
    }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Card deleted' });
  } catch (err) {
    await transaction.rollback();
    console.error('Error deleting card:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;