import express from 'express';
import { Tag, Card, Column } from '../models/index.js';
import sequelize from '../database/config.js';
import { Op } from 'sequelize';
const router = express.Router();

// Get all tags for logged-in user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const tags = await Tag.findAll({
      where: {
        [Op.or]: [
          { userId },
          { userId: null }
        ]
      },
      order: [['name', 'ASC']]
    });
    
    res.json(tags);
  } catch (err) {
    console.error('Error fetching tags:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific tag
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tag = await Tag.findByPk(id);
    
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    res.json(tag);
  } catch (err) {
    console.error('Error fetching tag:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new tag
router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;
    const userId = req.user.userId;
    
    // Check if tag name already exists for this user
    const existingTag = await Tag.findOne({
      where: {
        name,
        [Op.or]: [
          { userId },
          { userId: null }
        ]
      }
    });
    
    if (existingTag) {
      return res.status(400).json({ error: 'Tag name already exists' });
    }
    
    const tag = await Tag.create({
      name,
      color,
      userId
    });
    
    res.status(201).json(tag);
  } catch (err) {
    console.error('Error creating tag:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a tag
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    const userId = req.user.userId;
    
    // Check if tag exists
    const tag = await Tag.findByPk(id);
    
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    // Check if user is authorized to update this tag
    if (tag.userId !== null && tag.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this tag' });
    }
    
    // Check if new name already exists for a different tag owned by this user
    if (name && name !== tag.name) {
      const existingTag = await Tag.findOne({
        where: {
          name,
          id: { [sequelize.Op.ne]: id },
          [Op.or]: [
            { userId },
            { userId: null }
          ]
        }
      });
      
      if (existingTag) {
        return res.status(400).json({ error: 'Tag name already exists' });
      }
    }
    
    // Update the tag
    await tag.update({
      name: name || tag.name,
      color: color || tag.color
    });
    
    res.json(tag);
  } catch (err) {
    console.error('Error updating tag:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a tag
router.delete('/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Check if tag exists
    const tag = await Tag.findByPk(id, { transaction });
    
    if (!tag) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    // Check if user is authorized to delete this tag
    if (tag.userId !== null && tag.userId !== userId) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Not authorized to delete this tag' });
    }
    
    // Update cards that use this tag to have null tag_id
    await Card.update(
      { tagId: null },
      { 
        where: { tagId: id },
        transaction
      }
    );
    
    // Delete the tag
    await tag.destroy({ transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Tag deleted' });
  } catch (err) {
    await transaction.rollback();
    console.error('Error deleting tag:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all cards with a specific tag
router.get('/:id/cards', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Check if tag exists
    const tag = await Tag.findByPk(id);
    
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    // Get cards with this tag
    const cards = await Card.findAll({
      where: {
        tagId: id,
        [Op.or]: [
          { userId },
          { userId: null }
        ]
      },
      include: [
        {
          model: Column,
          attributes: ['name', 'position']
        }
      ],
      order: [
        [Column, 'position', 'ASC'],
        ['position', 'ASC']
      ]
    });
    
    // Transform to expected format
    const transformedCards = cards.map(card => ({
      id: card.id,
      title: card.title,
      description: card.description,
      column_id: card.columnId,
      position: card.position,
      tag_id: card.tagId,
      user_id: card.userId,
      created_at: card.created_at,
      column_name: card.Column ? card.Column.name : null
    }));
    
    res.json(transformedCards);
  } catch (err) {
    console.error('Error fetching cards with tag:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;