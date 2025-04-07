import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Define TypeScript interfaces
interface Tag {
  id: string;
  name: string;
  colorClass: string;
}

interface Task {
  id: number;
  title: string;
  description: string;
  tag: Tag;
  date: string;
}

interface Log {
  id: number;
  description: string;
  timestamp: Date;
}

type ColumnType = "backlog" | "todo" | "done";

const TaskList: React.FC = () => {
  // State for tasks in each column
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
  const [todoTasks, setTodoTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  
  // State for dragging
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeTaskSource, setActiveTaskSource] = useState<ColumnType | null>(null);
  
  // State for modals
  const [showAddCardModal, setShowAddCardModal] = useState<boolean>(false);
  const [showAddTagModal, setShowAddTagModal] = useState<boolean>(false);
  
  // State for logs
  const [logs, setLogs] = useState<Log[]>([]);
  
  // State for the current view (home or logs)
  const [currentView, setCurrentView] = useState<"home" | "logs">("home");
  
  // State for available tags
  const [tags, setTags] = useState<Tag[]>([
    { id: "1", name: "Shopping", colorClass: "bg-blue-900 text-blue-200" },
    { id: "2", name: "Cleaning", colorClass: "bg-green-900 text-green-200" },
    { id: "3", name: "Urgent", colorClass: "bg-red-900 text-red-200" },
  ]);
  
  // State for new card/tag form
  const [newCardTitle, setNewCardTitle] = useState<string>("");
  const [newCardDescription, setNewCardDescription] = useState<string>("");
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [newTagName, setNewTagName] = useState<string>("");
  const [newTagColor, setNewTagColor] = useState<string>("#3B82F6"); // Default to blue

  // Load data from localStorage on initial render
  useEffect(() => {
    const savedBacklog = localStorage.getItem("backlogTasks");
    const savedTodo = localStorage.getItem("todoTasks");
    const savedDone = localStorage.getItem("doneTasks");
    const savedLogs = localStorage.getItem("logs");
    const savedTags = localStorage.getItem("tags");

    if (savedBacklog) setBacklogTasks(JSON.parse(savedBacklog));
    if (savedTodo) setTodoTasks(JSON.parse(savedTodo));
    if (savedDone) setDoneTasks(JSON.parse(savedDone));
    if (savedLogs) setLogs(JSON.parse(savedLogs));
    if (savedTags) setTags(JSON.parse(savedTags));
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("backlogTasks", JSON.stringify(backlogTasks));
    localStorage.setItem("todoTasks", JSON.stringify(todoTasks));
    localStorage.setItem("doneTasks", JSON.stringify(doneTasks));
    localStorage.setItem("logs", JSON.stringify(logs));
    localStorage.setItem("tags", JSON.stringify(tags));
  }, [backlogTasks, todoTasks, doneTasks, logs, tags]);

  // Helper function to add a new log
  const addLog = (description: string) => {
    const newLog: Log = {
      id: Date.now(),
      description,
      timestamp: new Date(),
    };
    setLogs([newLog, ...logs]);
  };

  // Get column name for logs
  const getColumnName = (column: ColumnType): string => {
    switch (column) {
      case "backlog":
        return "Backlog";
      case "todo":
        return "To Do";
      case "done":
        return "Done";
      default:
        return "";
    }
  };

  // Handle drag start
  const handleDragStart = (event: { active: any }) => {
    const { active } = event;
    const taskId = active.id;

    // Find which array contains the task and set as source
    if (backlogTasks.some((task) => task.id === taskId)) {
      const task = backlogTasks.find((task) => task.id === taskId);
      if (task) {
        setActiveTask(task);
        setActiveTaskSource("backlog");
      }
    } else if (todoTasks.some((task) => task.id === taskId)) {
      const task = todoTasks.find((task) => task.id === taskId);
      if (task) {
        setActiveTask(task);
        setActiveTaskSource("todo");
      }
    } else if (doneTasks.some((task) => task.id === taskId)) {
      const task = doneTasks.find((task) => task.id === taskId);
      if (task) {
        setActiveTask(task);
        setActiveTaskSource("done");
      }
    }
  };

  // Handle drag end
  const handleDragEnd = (event: { active: any; over: any }) => {
    const { active, over } = event;

    if (!over || !activeTask || !activeTaskSource) {
      setActiveTask(null);
      setActiveTaskSource(null);
      return;
    }

    const taskId = active.id;

    // Check if dropping over a task or a column
    const isOverATask = [...backlogTasks, ...todoTasks, ...doneTasks].some(
      (task) => task.id === over.id
    );

    let targetStatus: ColumnType | null = null;
    
    if (isOverATask) {
      // If dropping over a task, determine which column that task is in
      if (backlogTasks.some((task) => task.id === over.id)) {
        targetStatus = "backlog";
      } else if (todoTasks.some((task) => task.id === over.id)) {
        targetStatus = "todo";
      } else if (doneTasks.some((task) => task.id === over.id)) {
        targetStatus = "done";
      }
    } else {
      // If dropping over a column, use the column id directly
      targetStatus = over.id as ColumnType;
    }

    if (!targetStatus) {
      setActiveTask(null);
      setActiveTaskSource(null);
      return;
    }

    // Get task title for logs
    const taskTitle = activeTask.title;

    if (activeTaskSource === targetStatus && isOverATask) {
      // Reordering within the same column
      let newTasks: Task[];
      let oldIndex: number = -1;
      let newIndex: number = -1;

      if (targetStatus === "backlog") {
        oldIndex = backlogTasks.findIndex((task) => task.id === taskId);
        newIndex = backlogTasks.findIndex((task) => task.id === over.id);
        newTasks = arrayMove(backlogTasks, oldIndex, newIndex);
        setBacklogTasks(newTasks);
      } else if (targetStatus === "todo") {
        oldIndex = todoTasks.findIndex((task) => task.id === taskId);
        newIndex = todoTasks.findIndex((task) => task.id === over.id);
        newTasks = arrayMove(todoTasks, oldIndex, newIndex);
        setTodoTasks(newTasks);
      } else if (targetStatus === "done") {
        oldIndex = doneTasks.findIndex((task) => task.id === taskId);
        newIndex = doneTasks.findIndex((task) => task.id === over.id);
        newTasks = arrayMove(doneTasks, oldIndex, newIndex);
        setDoneTasks(newTasks);
      }

      // Add log for reordering
      const direction = oldIndex > newIndex ? "up" : "down";
      addLog(`"${taskTitle}" was moved ${direction} within the column "${getColumnName(targetStatus)}"`);
    } else if (activeTaskSource !== targetStatus) {
      // Moving between columns
      if (activeTaskSource === "backlog") {
        setBacklogTasks(backlogTasks.filter((task) => task.id !== taskId));
      } else if (activeTaskSource === "todo") {
        setTodoTasks(todoTasks.filter((task) => task.id !== taskId));
      } else if (activeTaskSource === "done") {
        setDoneTasks(doneTasks.filter((task) => task.id !== taskId));
      }

      if (targetStatus === "backlog") {
        setBacklogTasks([...backlogTasks, activeTask]);
      } else if (targetStatus === "todo") {
        setTodoTasks([...todoTasks, activeTask]);
      } else if (targetStatus === "done") {
        setDoneTasks([...doneTasks, activeTask]);
      }

      // Add log for moving between columns
      addLog(`"${taskTitle}" was moved to "${getColumnName(targetStatus)}"`);
    }

    setActiveTask(null);
    setActiveTaskSource(null);
  };

  // Component for sortable task items
  const SortableTaskItem: React.FC<{ task: Task; isDone: boolean }> = ({ task, isDone }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
      useSortable({
        id: task.id,
        data: task,
      });

    const style = {
      transform: CSS.Transform.toString(transform),
      opacity: isDragging ? 0.4 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`p-3 mb-3 rounded-md hover:bg-gray-800 bg-gray-850 border ${
          isDragging ? "border-dashed border-gray-700" : "border-gray-800"
        } cursor-grab transition-colors ${isDone ? "opacity-75" : ""}`}
      >
        <div className="flex justify-between mb-2">
          <span className={`px-2 py-1 text-xs rounded-full ${task.tag.colorClass}`}>
            {task.tag.name}
          </span>
          <span className="text-xs text-gray-500">{task.date}</span>
        </div>
        <h3 className={`font-medium ${isDone ? "text-gray-300 line-through" : "text-gray-200"}`}>
          {task.title}
        </h3>
        <p className={`text-sm ${isDone ? "text-gray-500" : "text-gray-400"} mt-1`}>
          {task.description}
        </p>
      </div>
    );
  };

  // Component for column
  const Column: React.FC<{ title: string; status: ColumnType; tasks: Task[] }> = ({ 
    title, 
    status, 
    tasks 
  }) => {
    const { setNodeRef } = useDroppable({
      id: status,
    });

    const tasksIds = tasks.map((task) => task.id);

    return (
      <div className="flex flex-col w-80 rounded-lg shadow-lg bg-gray-900 border border-gray-800">
        <div className="flex items-center p-4 rounded-t-lg bg-gray-900 border-b border-gray-800">
          <h2 className="text-lg font-medium text-white">{title}</h2>
          <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-800 text-gray-300">
            {tasks.length}
          </span>
        </div>
        <div ref={setNodeRef} className="flex-1 p-3 min-h-[200px]">
          <SortableContext items={tasksIds} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <SortableTaskItem key={task.id} task={task} isDone={status === "done"} />
            ))}
          </SortableContext>
          <button
            onClick={() => {
              setSelectedTagId(tags[0]?.id || "");
              setShowAddCardModal(true);
            }}
            className="w-full p-2 mt-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
          >
            Create a card
          </button>
        </div>
      </div>
    );
  };

  // Add new card handler
  const handleAddCard = () => {
    if (!newCardTitle.trim()) return;
    
    const selectedTag = tags.find(tag => tag.id === selectedTagId);
    if (!selectedTag) return;
    
    const newTask: Task = {
      id: Date.now(),
      title: newCardTitle,
      description: newCardDescription,
      tag: selectedTag,
      date: "Just now",
    };

    setBacklogTasks([...backlogTasks, newTask]);
    addLog(`New card "${newCardTitle}" was created in "Backlog"`);
    
    // Reset form
    setNewCardTitle("");
    setNewCardDescription("");
    setSelectedTagId(tags[0]?.id || "");
    setShowAddCardModal(false);
  };

  // Add new tag handler
  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    
    // Convert hex color to tailwind-like class
    const colorMap: Record<string, string> = {
      "#EF4444": "bg-red-900 text-red-200",     // Red
      "#F59E0B": "bg-yellow-900 text-yellow-200", // Yellow
      "#10B981": "bg-green-900 text-green-200",  // Green
      "#3B82F6": "bg-blue-900 text-blue-200",   // Blue
      "#8B5CF6": "bg-purple-900 text-purple-200", // Purple
      "#EC4899": "bg-pink-900 text-pink-200",   // Pink
      "#6B7280": "bg-gray-900 text-gray-200",   // Gray
    };
    
    const colorClass = colorMap[newTagColor] || "bg-blue-900 text-blue-200";
    
    const newTag: Tag = {
      id: Date.now().toString(),
      name: newTagName,
      colorClass: colorClass,
    };

    setTags([...tags, newTag]);
    setSelectedTagId(newTag.id); // Select the new tag in the card modal
    
    // Reset form
    setNewTagName("");
    setShowAddTagModal(false);
  };

  // Group logs by date for display
  const groupLogsByDate = () => {
    const grouped: Record<string, Log[]> = {};
    
    logs.forEach(log => {
      const date = new Date(log.timestamp);
      const dateKey = date.toLocaleDateString();
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push(log);
    });
    
    return grouped;
  };

  // Determine if a date is today, yesterday, or show actual date
  const formatLogDate = (dateStr: string): string => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = today.toLocaleDateString();
    const yesterdayStr = yesterday.toLocaleDateString();
    
    if (dateStr === todayStr) return "Today";
    if (dateStr === yesterdayStr) return "Yesterday";
    return dateStr;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-gray-100">
      {/* App bar */}
      <div className="sticky top-0 z-10 w-full">
        <div className="flex items-center justify-between w-full p-4 bg-gray-900 border-b border-gray-800 shadow-md">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-white">Rehla Todo</h1>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setCurrentView("home")}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-md ${
                currentView === "home" 
                  ? "bg-gray-800 text-white" 
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              Homepage
            </button>
            <button 
              onClick={() => setCurrentView("logs")}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-md ${
                currentView === "logs" 
                  ? "bg-gray-800 text-white" 
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              History Logs
            </button>
          </div>
        </div>
      </div>

      {currentView === "home" ? (
        <DndContext
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCenter}
        >
          {/* Task columns */}
          <div className="flex flex-1 gap-6 p-6 overflow-auto bg-gray-950">
            <Column title="Backlog" status="backlog" tasks={backlogTasks} />
            <Column title="To Do" status="todo" tasks={todoTasks} />
            <Column title="Done" status="done" tasks={doneTasks} />
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeTask && (
              <div className="p-3 rounded-md bg-gray-850 border border-gray-700 shadow-lg w-80">
                <div className="flex justify-between mb-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${activeTask.tag.colorClass}`}>
                    {activeTask.tag.name}
                  </span>
                  <span className="text-xs text-gray-500">{activeTask.date}</span>
                </div>
                <h3 className="font-medium text-gray-200">{activeTask.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{activeTask.description}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        /* History Logs Page */
        <div className="flex-1 p-6 bg-gray-950 overflow-auto">
          <div className="max-w-3xl mx-auto bg-gray-900 rounded-lg shadow-lg border border-gray-800">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-xl font-medium text-white">History Logs</h2>
            </div>
            <div className="p-4">
              {Object.entries(groupLogsByDate()).map(([date, dateLogs]) => (
                <div key={date} className="mb-6">
                  <h3 className="text-lg font-medium text-gray-300 mb-3">
                    {formatLogDate(date)}
                  </h3>
                  <ul className="space-y-2">
                    {dateLogs.map((log) => (
                      <li key={log.id} className="text-gray-400">
                        {log.description}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-gray-500 text-center py-6">No activity logs yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg shadow-lg p-6 w-96 border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">Create a card</h3>
              <button 
                onClick={() => setShowAddCardModal(false)}
                className="text-gray-400 hover:text-white"
              >
                X
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Card Title
                </label>
                <input
                  type="text"
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter card title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Card Description
                </label>
                <textarea
                  value={newCardDescription}
                  onChange={(e) => setNewCardDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                  placeholder="Enter card description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Select a Tag
                </label>
                <div className="flex items-center">
                  <select
                    value={selectedTagId}
                    onChange={(e) => setSelectedTagId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setShowAddCardModal(false);
                      setShowAddTagModal(true);
                    }}
                    className="ml-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md"
                  >
                    New Tag
                  </button>
                </div>
              </div>
              <button
                onClick={handleAddCard}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tag Modal */}
      {showAddTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg shadow-lg p-6 w-96 border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">Create a new Tag</h3>
              <button 
                onClick={() => setShowAddTagModal(false)}
                className="text-gray-400 hover:text-white"
              >
                X
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Tag Name
                </label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter tag name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Color Picker
                </label>
                <div className="flex flex-wrap gap-2">
                  {["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280"].map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full ${
                        newTagColor === color ? "ring-2 ring-white" : ""
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTagColor(color)}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={handleAddTag}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;