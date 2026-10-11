export default function response(status, data, message) {
    const payload = {
        status,
        data,
        message
    }
    return payload;
}