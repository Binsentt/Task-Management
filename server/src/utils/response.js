export default function createResponse({ status, data = null, message = ""}) {
    return  {
        status,
        data,
        message
    };
}