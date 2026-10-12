const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const buildFallbackApiUrl = () => {
	if (typeof window === "undefined") {
		return "";
	}

	const hostname = window.location.hostname;

	if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") {
		return "http://localhost:5000";
	}

	return `http://${hostname}:5000`;
};

const API_URL = configuredApiUrl
	? configuredApiUrl.replace(/\/$/, "")
	: buildFallbackApiUrl();

export async function apiRequest(
	endpoint,
	options = {}
) {
	if (!API_URL) {
		throw new Error(
			"The API URL is not configured. Set VITE_API_URL in the frontend deployment."
		);
	}

	const token =
		localStorage.getItem("meetingToken");

	const headers = {
		"Content-Type": "application/json",
		...(options.headers || {})
	};

	if (token) {
		headers.Authorization =
			`Bearer ${token}`;
	}

	let response;

	try {
		response = await fetch(
			`${API_URL}${endpoint}`,
			{
				...options,
				headers
			}
		);
	} catch {
		throw new Error(
			"Unable to reach the meeting server. Check VITE_API_URL and the backend deployment."
		);
	}

	let data = {};

	try {
		data = await response.json();
	} catch {
		data = {};
	}

	if (!response.ok) {
		throw new Error(
			data.message ||
			"Request failed"
		);
	}

	return data;
}

export { API_URL };
