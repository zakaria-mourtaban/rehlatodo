import type { Route } from ".react-router/types/app/+types/root";
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Rehla todo - Tasks" },
    { name: "description", content: "Manage your tasks with Rehla Todo" },
  ];
}

// Define types based on backend models
interface Card {
  id: number;
  title: string;
  description: string;
  column_id: number;
  position: number;
  tag_id: number | null;
  userId: number | null;
  created_at: string;
}

interface Tag {
  id: number;
  name: string;
  color: string;
  userId: number | null;
}

interface Column {
  id: number;
  name: string;
  position: number;
  userId: number | null;
  cards: Card[];
}

interface Log {
  id: number;
  cardId: number;
  cardTitle: string;
  actionType: string;
  fromColumn: string | null;
  toColumn: string | null;
  fromPosition: number | null;
  toPosition: number | null;
  userId: number | null;
  created_at: string;
}

interface DragInfo {
  column_id: number;
  cardId: number;
  index: number;
}

export default function Tasks() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, logout, isAuthenticated, isLoading: authLoading, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  
  // Refs for drag operations
  const dragCard = useRef<DragInfo | null>(null);
  const dragOverCard = useRef<DragInfo | null>(null);

  // State for modals
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showAddTagModal, setShowAddTagModal] = useState(false);
  const [activeColumn, setActiveColumn] = useState<number | null>(null);
  
  // Form states
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDescription, setNewCardDescription] = useState('');
  const [newCardTag, setNewCardTag] = useState<number | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#4F46E5'); // Default indigo color

  // Check authentication and redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Fetch board data (columns, cards, tags)
  useEffect(() => {
    const fetchBoardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const authHeaders = getAuthHeaders();
        
        // Fetch columns with cards
        const columnsResponse = await axios.get('http://localhost:5000/api/columns', { 
          headers: authHeaders,
          withCredentials: true 
        });
        
        // Fetch tags
        const tagsResponse = await axios.get('http://localhost:5000/api/tags', { 
          headers: authHeaders,
          withCredentials: true 
        });
        
        setColumns(columnsResponse.data);
        setTags(tagsResponse.data);
      } catch (err) {
        console.error('Error fetching board data:', err);
        setError('Failed to load board data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch data if user is authenticated
    if (isAuthenticated && !authLoading) {
      fetchBoardData();
    }
  }, [isAuthenticated, authLoading, getAuthHeaders]);

  // Logout handler
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Card drag handlers
  const handleDragStart = (column_id: number, cardId: number, index: number) => {
    dragCard.current = { column_id, cardId, index };
    // Add styling to dragged element
    const cardElement = document.getElementById(`card-${cardId}`);
    if (cardElement) {
      cardElement.classList.add('opacity-50');
    }
  };

  const handleDragOver = (e: React.DragEvent, column_id: number, cardId: number, index: number) => {
    e.preventDefault();
    dragOverCard.current = { column_id, cardId, index };
    
    // Add visual indication for drop target
    const cardElements = document.querySelectorAll('.card-item');
    cardElements.forEach(card => {
      card.classList.remove('border-indigo-400', 'border-2');
    });
    
    const targetCard = document.getElementById(`card-${cardId}`);
    if (targetCard) {
      targetCard.classList.add('border-indigo-400', 'border-2');
    }
  };

  const handleColumnDragOver = (e: React.DragEvent, column_id: number) => {
    e.preventDefault();
    if (!dragOverCard.current || dragOverCard.current.column_id !== column_id) {
      dragOverCard.current = { column_id, cardId: -1, index: -1 };
    }
  };

  const handleDragEnd = async (e: React.DragEvent) => {
    // Remove styling
    const cardElements = document.querySelectorAll('.card-item');
    cardElements.forEach(card => {
      card.classList.remove('opacity-50', 'border-indigo-400', 'border-2');
    });
    
    // If no valid drag references, return
    if (!dragCard.current || !dragOverCard.current) return;
    
    const { column_id: fromcolumn_id, cardId, index: fromIndex } = dragCard.current;
    const { column_id: tocolumn_id, index: toIndex } = dragOverCard.current;
    
    // If dropped in the same position, do nothing
    if (fromcolumn_id === tocolumn_id && fromIndex === toIndex) {
      dragCard.current = null;
      dragOverCard.current = null;
      return;
    }
    
    try {
      // Clone columns for optimistic update
      const newColumns = [...columns];
      
      // Find the card to move
      const fromColumnIndex = newColumns.findIndex(col => col.id === fromcolumn_id);
      if (fromColumnIndex === -1) return;
      
      const cardToMove = newColumns[fromColumnIndex].cards.find(card => card.id === cardId);
      if (!cardToMove) return;
      
      // Remove card from source
      newColumns[fromColumnIndex].cards = newColumns[fromColumnIndex].cards.filter(card => card.id !== cardId);
      
      // Add card to destination
      const toColumnIndex = newColumns.findIndex(col => col.id === tocolumn_id);
      if (toColumnIndex === -1) return;
      
      // If dropped at the end of a column
      if (toIndex === -1) {
        // Find the highest position in the destination column
        const highestPosition = newColumns[toColumnIndex].cards.length > 0
          ? Math.max(...newColumns[toColumnIndex].cards.map(card => card.position))
          : 0;
          
        cardToMove.position = highestPosition + 1;
        cardToMove.column_id = tocolumn_id;
        newColumns[toColumnIndex].cards.push(cardToMove);
      } else {
        // Recalculate positions for all cards in the target column
        const insertPosition = toIndex;
        newColumns[toColumnIndex].cards.splice(insertPosition, 0, {
          ...cardToMove,
          column_id: tocolumn_id
        });
        
        // Update positions
        newColumns[toColumnIndex].cards = newColumns[toColumnIndex].cards.map((card, index) => ({
          ...card,
          position: index + 1
        }));
      }
      
      // Optimistic update
      setColumns(newColumns);
      
      // Send update to server
      await axios.put(`http://localhost:5000/api/cards/${cardId}`, {
        column_id: tocolumn_id,
        position: toIndex === -1 
          ? Math.max(...newColumns[toColumnIndex].cards.map(card => card.position)) 
          : toIndex + 1
      }, { 
        headers: getAuthHeaders(),
        withCredentials: true 
      });
      
    } catch (err) {
      console.error('Error updating card position:', err);
      setError('Failed to update card position. Please try again.');
      
      // Fetch fresh data to reset the state
      const columnsResponse = await axios.get('http://localhost:5000/api/columns', { 
        headers: getAuthHeaders(),
        withCredentials: true 
      });
      setColumns(columnsResponse.data);
    } finally {
      // Reset drag references
      dragCard.current = null;
      dragOverCard.current = null;
    }
  };

  // Handle creating a new card
  const handleCreateCard = async () => {
    if (!activeColumn || !newCardTitle.trim()) return;
    
    try {
      // Find the max position in the active column
      const column = columns.find(col => col.id === activeColumn);
      if (!column) return;
      
      const maxPosition = column.cards.length > 0
        ? Math.max(...column.cards.map(card => card.position))
        : 0;
      
      // Create new card
      const response = await axios.post('http://localhost:5000/api/cards', {
        title: newCardTitle,
        description: newCardDescription,
        column_id: activeColumn,
        position: maxPosition + 1,
        tag_id: newCardTag
      }, { 
        headers: getAuthHeaders(),
        withCredentials: true 
      });
      
      // Update state with new card
      const newCard = response.data;
      setColumns(prevColumns => {
        return prevColumns.map(col => {
          if (col.id === activeColumn) {
            return {
              ...col,
              cards: [...col.cards, newCard]
            };
          }
          return col;
        });
      });
      
      // Reset form and close modal
      setNewCardTitle('');
      setNewCardDescription('');
      setNewCardTag(null);
      setShowAddCardModal(false);
    } catch (err) {
      console.error('Error creating card:', err);
      setError('Failed to create card. Please try again.');
    }
  };

  // Handle creating a new tag
  const handleCreateTag = async () => {
    if (!newTagName.trim() || !newTagColor) return;
    
    try {
      // Create new tag
      const response = await axios.post('http://localhost:5000/api/tags', {
        name: newTagName,
        color: newTagColor
      }, { 
        headers: getAuthHeaders(),
        withCredentials: true 
      });
      
      // Update state with new tag
      setTags(prevTags => [...prevTags, response.data]);
      
      // Reset form and close modal
      setNewTagName('');
      setNewTagColor('#4F46E5');
      setShowAddTagModal(false);
    } catch (err) {
      console.error('Error creating tag:', err);
      setError('Failed to create tag. Please try again.');
    }
  };

  // If still checking authentication or loading data, show loading spinner
  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-gray-100">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p>Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">Rehla Todo</h1>
            <nav className="ml-8">
              <ul className="flex space-x-4">
                <li>
                  <a href="/todo" className="text-indigo-400 font-medium">Board</a>
                </li>
                <li>
                  <a href="/history" className="text-gray-300 hover:text-indigo-400">History</a>
                </li>
              </ul>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowAddTagModal(true)}
              className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Create Tag
            </button>
            <span className="text-sm text-gray-400">Welcome, {user?.name || user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto p-4">
        {error && (
          <div className="mb-4 bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded">
            <p>{error}</p>
          </div>
        )}

        {/* Kanban board */}
        <div className="flex space-x-4 overflow-x-auto py-4">
          {columns.map(column => (
            <div 
              key={column.id} 
              className="flex-shrink-0 w-80 bg-gray-800 rounded-lg shadow-lg border border-gray-700"
              onDragOver={(e) => handleColumnDragOver(e, column.id)}
            >
              <div className="p-3 border-b border-gray-700">
                <h3 className="font-medium text-lg">{column.name}</h3>
              </div>
              <div className="p-2 min-h-64">
                {column.cards.map((card, index) => (
                  <div 
                    key={card.id}
                    id={`card-${card.id}`}
                    className="card-item bg-gray-700 p-3 rounded mb-2 shadow border border-gray-600 cursor-move"
                    draggable
                    onDragStart={() => handleDragStart(column.id, card.id, index)}
                    onDragOver={(e) => handleDragOver(e, column.id, card.id, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <h4 className="font-medium">{card.title}</h4>
                    {card.description && (
                      <p className="text-gray-400 text-sm mt-1">{card.description}</p>
                    )}
                    {card.tag_id && tags.find(tag => tag.id === card.tag_id) && (
                      <div 
                        className="mt-2 inline-block px-2 py-1 rounded-full text-xs"
                        style={{ 
                          backgroundColor: tags.find(tag => tag.id === card.tag_id)?.color || '#4B5563',
                          color: 'white'
                        }}
                      >
                        {tags.find(tag => tag.id === card.tag_id)?.name}
                      </div>
                    )}
                  </div>
                ))}
                <button 
                  className="w-full mt-2 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded text-sm text-left"
                  onClick={() => {
                    setActiveColumn(column.id);
                    setShowAddCardModal(true);
                  }}
                >
                  + Create a card
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Placeholder content if no columns exist yet */}
        {columns.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-medium mb-2">No tasks yet</h3>
            <p className="text-gray-400 mb-4">Get started by creating your first task board</p>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
              Create Board
            </button>
          </div>
        )}
      </main>

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Create a card</h3>
              <button 
                onClick={() => setShowAddCardModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="cardTitle" className="block text-sm font-medium text-gray-300 mb-1">
                  Card Title
                </label>
                <input
                  id="cardTitle"
                  type="text"
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  className="bg-gray-700 block w-full px-3 py-2 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter card title"
                />
              </div>
              <div>
                <label htmlFor="cardDescription" className="block text-sm font-medium text-gray-300 mb-1">
                  Card Description
                </label>
                <textarea
                  id="cardDescription"
                  value={newCardDescription}
                  onChange={(e) => setNewCardDescription(e.target.value)}
                  className="bg-gray-700 block w-full px-3 py-2 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter card description"
                  rows={3}
                />
              </div>
              <div>
                <label htmlFor="cardTag" className="block text-sm font-medium text-gray-300 mb-1">
                  Select a Tag
                </label>
                <select
                  id="cardTag"
                  value={newCardTag || ''}
                  onChange={(e) => setNewCardTag(e.target.value ? parseInt(e.target.value) : null)}
                  className="bg-gray-700 block w-full px-3 py-2 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">No tag</option>
                  {tags.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleCreateCard}
                disabled={!newCardTitle.trim()}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tag Modal */}
      {showAddTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Create a tag</h3>
              <button 
                onClick={() => setShowAddTagModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="tagName" className="block text-sm font-medium text-gray-300 mb-1">
                  Tag Name
                </label>
                <input
                  id="tagName"
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="bg-gray-700 block w-full px-3 py-2 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter tag name"
                />
              </div>
              <div>
                <label htmlFor="tagColor" className="block text-sm font-medium text-gray-300 mb-1">
                  Tag Color
                </label>
                <div className="flex">
                  <input
                    id="tagColor"
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="h-10 w-10 rounded border border-gray-600 bg-transparent"
                  />
                  <input
                    type="text"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="ml-2 bg-gray-700 block w-full px-3 py-2 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className="w-6 h-6 rounded-full border border-gray-600"
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}