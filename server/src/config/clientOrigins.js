export function getClientOrigins() {
    return [
        process.env.CLIENT_URL,
        ...(process.env.CORS_ORIGINS || '').split(','),
    ].map((origin) => origin?.trim()).filter(Boolean);
}

export function isClientOriginAllowed(origin) {
    return getClientOrigins().includes(origin);
}
