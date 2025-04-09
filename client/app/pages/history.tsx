import type { Route } from ".react-router/types/app/+types/root";
import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Rehla todo - History" },
		{
			name: "description",
			content: "View your task history with Rehla Todo",
		},
	];
}

// Define types
interface LogEntry {
	description: string;
	id: number;
	cardId: number;
	card_title: string;
	actionType: string;
	fromColumn: string | null;
	toColumn: string | null;
	fromPosition: number | null;
	toPosition: number | null;
	userId: number | null;
	created_at: string;
}

interface GroupedLogs {
	[date: string]: LogEntry[];
}

export default function History() {
	const [groupedLogs, setGroupedLogs] = useState<GroupedLogs>({});
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const {
		user,
		logout,
		isAuthenticated,
		isLoading: authLoading,
		getAuthHeaders,
	} = useAuth();
	const navigate = useNavigate();

	// Check authentication and redirect if not authenticated
	useEffect(() => {
		if (!authLoading && !isAuthenticated) {
			navigate("/");
		}
	}, [isAuthenticated, authLoading, navigate]);

	// Fetch logs data
	useEffect(() => {
		const fetchLogs = async () => {
			try {
				setIsLoading(true);
				setError(null);

				// Fetch logs with auth headers from the component-level hook
				const response = await axios.get(
					"http://localhost:5000/api/logs/readable",
					{
						headers: getAuthHeaders(),
						withCredentials: true,
					}
				);
				console.log(response);
				// Group logs by date
				const grouped = response.data.reduce(
					(acc: GroupedLogs, log: LogEntry) => {
						// Format date - extract just the date part
						const date = new Date(
							log.created_at
						).toLocaleDateString("en-US", {
							year: "numeric",
							month: "2-digit",
							day: "2-digit",
						});

						if (!acc[date]) {
							acc[date] = [];
						}

						acc[date].push(log);
						return acc;
					},
					{}
				);

				setGroupedLogs(grouped);
			} catch (err) {
				console.error("Error fetching logs:", err);
				setError("Failed to load history logs. Please try again.");
			} finally {
				setIsLoading(false);
			}
		};

		// Only fetch data if user is authenticated
		if (isAuthenticated && !authLoading) {
			fetchLogs();
		}
	}, [isAuthenticated, authLoading, getAuthHeaders]);

	// Logout handler
	const handleLogout = async () => {
		await logout();
		navigate("/");
	};

	// Format the log message based on action type
	const formatLogMessage = (log: LogEntry): string => {
		console.log(log);
		switch (log.actionType) {
			case "created":
				return `"${log.card_title}" was created in "${log.toColumn}"`;
			case "moved_column":
				return `"${log.card_title}" was moved from "${log.fromColumn}" to "${log.toColumn}"`;
			case "moved_up":
				return `"${log.card_title}" was moved up within the column "${log.toColumn}"`;
			case "moved_down":
				return `"${log.card_title}" was moved down within the column "${log.toColumn}"`;
			case "deleted":
				return `"${log.card_title}" was deleted from "${log.fromColumn}"`;
			default:
				return `"${log.card_title}" was updated`;
		}
	};

	// Format time from ISO string
	const formatTime = (isoString: string): string => {
		return new Date(isoString).toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// If still checking authentication or loading data, show loading spinner
	if (authLoading || isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-900 text-gray-100">
				<div className="flex flex-col items-center">
					<svg
						className="animate-spin h-10 w-10 text-indigo-500 mb-4"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						></circle>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					<p>Loading history...</p>
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
									<a
										href="/todo"
										className="text-gray-300 hover:text-indigo-400"
									>
										Board
									</a>
								</li>
								<li>
									<a
										href="/history"
										className="text-indigo-400 font-medium"
									>
										History
									</a>
								</li>
							</ul>
						</nav>
					</div>
					<div className="flex items-center space-x-4">
						<span className="text-sm text-gray-400">
							Welcome, {user?.name || user?.email}
						</span>
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

				<div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
					<h2 className="text-xl font-bold mb-6">History Logs</h2>

					{Object.keys(groupedLogs).length === 0 ? (
						<div className="text-center py-8 text-gray-400">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-12 w-12 mx-auto mb-4 text-gray-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<p>No history logs found.</p>
							<p className="text-sm mt-2">
								Activity will appear here as you make changes to
								your board.
							</p>
						</div>
					) : (
						<div className="space-y-6">
							{Object.entries(groupedLogs)
								.sort(
									([dateA], [dateB]) =>
										new Date(dateB).getTime() -
										new Date(dateA).getTime()
								)
								.map(([date, logs]) => (
									<div
										key={date}
										className="border-b border-gray-700 pb-4 last:border-0"
									>
										<h3 className="font-medium text-lg mb-3 text-indigo-400">
											{date}
										</h3>
										<div className="space-y-2">
											{logs
												.sort(
													(a, b) =>
														new Date(
															b.created_at
														).getTime() -
														new Date(
															a.created_at
														).getTime()
												)
												.map((log) => (
													<div
														key={log.id}
														className="flex items-start"
													>
														<span className="text-gray-500 text-sm w-16 flex-shrink-0">
															{formatTime(
																log.created_at
															)}
														</span>
														<span className="text-gray-200">
															{log.description}
														</span>
													</div>
												))}
										</div>
									</div>
								))}
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
