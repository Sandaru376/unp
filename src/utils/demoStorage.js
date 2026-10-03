const getStorage = () => {
	try {
		return typeof window === "undefined" ? null : window.localStorage;
	} catch {
		return null;
	}
};

export const loadDemoData = (key, fallback = []) => {
	try {
		const storage = getStorage();
		if (!storage) return fallback;

		const saved = storage.getItem(key);
		if (saved === null) return fallback;

		const data = JSON.parse(saved);
		return Array.isArray(fallback) && !Array.isArray(data)
			? fallback
			: data;
	} catch (error) {
		console.error(`Failed to load demo data: ${key}`, error);
		return fallback;
	}
};

export const saveDemoData = (key, data) => {
	try {
		getStorage()?.setItem(key, JSON.stringify(data));
	} catch (error) {
		console.error(`Failed to save demo data: ${key}`, error);
	}
};

export const clearDemoData = (key) => {
	try {
		getStorage()?.removeItem(key);
	} catch (error) {
		console.error(`Failed to clear demo data: ${key}`, error);
	}
};