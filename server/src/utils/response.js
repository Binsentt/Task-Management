export default function createResponse(result, data = null, message = '') {
    if (result && typeof result === 'object') {
        return {
            status: result.status,
            data: result.data ?? null,
            message: result.message ?? ''
        };
    }

    return { status: result, data, message };
}