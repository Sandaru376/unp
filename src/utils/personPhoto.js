const MAX_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 320;
const MAX_RAW_LENGTH = 400_000;

const isVector = (type) => type === "image/svg+xml";
const isAnimated = (type) => type === "image/gif" || type === "image/webp";

const load = (src) =>
	new Promise((resolve, reject) => {
		const image = new Image();

		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("That file is not a valid image."));
		image.src = src;
	});

const downscale = async (src, type) => {
	if (isVector(type) || isAnimated(type)) return src;

	if (src.length <= MAX_RAW_LENGTH) return src;

	const image = await load(src);
	const longest = Math.max(image.width, image.height) || 1;
	const scale = Math.min(1, MAX_EDGE / longest);
	const width = Math.max(1, Math.round(image.width * scale));
	const height = Math.max(1, Math.round(image.height * scale));

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const context = canvas.getContext("2d");
	if (!context) return src;

	context.drawImage(image, 0, 0, width, height);

	try {
		return canvas.toDataURL("image/jpeg", 0.85);
	} catch {
		return src;
	}
};

export async function readPersonPhoto(file) {
	if (!file) throw new Error("Choose an image first.");

	if (!file.type || !file.type.startsWith("image/")) {
		throw new Error("Please choose an image file (JPG, PNG or GIF).");
	}

	if (file.size > MAX_BYTES) {
		throw new Error("That image is too large — maximum size is 5 MB.");
	}

	const src = await new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onerror = () => reject(new Error("The image could not be read."));
		reader.onload = () => resolve(String(reader.result || ""));

		reader.readAsDataURL(file);
	});

	if (!src) throw new Error("The image could not be read.");

	try {
		return await downscale(src, file.type);
	} catch {
		return src;
	}
}
